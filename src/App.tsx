import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import { Accordion, AccordionDetails, AccordionSummary, AppBar, Button, Container, Slider, Stack, Switch, Toolbar, Typography } from '@mui/material';
import Webcam from 'react-webcam';
import cv, { Mat, Rect } from "opencv-ts";



const videoConstrain: MediaTrackConstraints = {
  facingMode: "environment",
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function pollRef<T>(ref: React.RefObject<T>) {
  for (let i = 0; i < 100; i++) {
    if (ref.current !== null) {
      return ref.current;
    }
    await sleep(100);
  }
  return null;
}


function App() {
  const webcamRef = useRef<Webcam>(null);
  const [displayImage, setDisplayImage] = useState<string | null>(null);
  const [webcamEnable, setWebcamEnable] = useState(false);

  const [width, setWidth] = useState(500);
  const [height, setHeight] = useState(500);

  const capture = async () => {
    const webcam = webcamRef.current;
    if (webcam === null) {
      alert("No camera");
      return;
    }

    const img = webcam.getScreenshot({ width: width, height: height });
    console.log(`img = ${img}`);
    setDisplayImage(img);
  }

  return (
    <Stack direction="column" spacing={2}>
      <AppBar position='static'>
        <Toolbar>
          <Typography variant='h6'>Cloth scan</Typography>
        </Toolbar>
      </AppBar>
      <Switch checked={webcamEnable} onChange={() => setWebcamEnable(!webcamEnable)} />

      {webcamEnable &&
        < Webcam
          ref={webcamRef}
          audio={false}
          videoConstraints={videoConstrain}
          width={500}
          height={500}
        />
      }


      {displayImage && (
        <>
          <CV img={displayImage} />
        </>
      )}

      <Button onClick={capture}>capture</Button>
    </Stack>
  );
}


function CV(props: { img: string }) {
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasGrayRef = useRef<HTMLCanvasElement>(null);
  const canvasThresRef = useRef<HTMLCanvasElement>(null);
  const canvasDetectRef = useRef<HTMLCanvasElement>(null);

  const [threshould, setThreshould] = useState(190);
  const [objCount, setObjCount] = useState<number | null>(null);


  useLayoutEffect(() => {
    const task = async () => {
      await sleep(0);

      const image = cv.imread(imageRef.current!);

      const gray = new cv.Mat();
      cv.cvtColor(image, gray, cv.COLOR_BGR2GRAY);
      cv.imshow(canvasGrayRef.current!, gray);

      const thres = new cv.Mat();
      cv.threshold(gray, thres, threshould, 255, cv.THRESH_BINARY);
      cv.imshow(canvasThresRef.current!, thres);

      const cons = new cv.MatVector();
      const hir = new cv.Mat();
      cv.findContours(thres, cons, hir, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      for (let i = 0; i < cons.size(); i++) {
        const c = cons.get(i);
        const rect = cv.boundingRect(c);
        cv.rectangle(image, new cv.Point(rect.x, rect.y), new cv.Point(rect.x + rect.width, rect.y + rect.height), new cv.Scalar(0, 0, 255))
      }
      cv.imshow(canvasDetectRef.current!, image);
      setObjCount(cons.size())
    };
    task();
  }, [props.img, threshould]);



  return <div>
    <Slider
      value={threshould}
      min={0}
      max={255}
      valueLabelDisplay='on'
      onChange={(_, val) => setThreshould(val as number)}>
    </Slider>
    <img width={500} height={500} ref={imageRef} src={props.img}></img>
    <Accordion>
      <AccordionSummary>
        <Typography>Gray</Typography>
      </AccordionSummary>
      <canvas ref={canvasGrayRef}></canvas>
    </Accordion>
    <Accordion>
      <AccordionSummary>
        <Typography>Threshoulded</Typography>
      </AccordionSummary>
      <canvas ref={canvasThresRef}></canvas>
    </Accordion>
    <AccordionSummary>
      <Typography>Detected [{objCount}]</Typography>
    </AccordionSummary>
    <canvas ref={canvasDetectRef}></canvas>
  </div >;

}

export default App;
