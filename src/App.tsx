import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import { Accordion, AccordionDetails, AccordionSummary, AppBar, Box, Button, Container, FormControlLabel, Input, Slider, Stack, Switch, TextField, Toolbar, Typography } from '@mui/material';
import Webcam from 'react-webcam';
import cv, { Mat, Rect } from "opencv-ts";
import { CovarFlags } from 'opencv-ts/src/core/Core';



const videoConstrain: MediaTrackConstraints = {
  facingMode: "environment",
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function readBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function App() {
  const webcamRef = useRef<Webcam>(null);
  const [displayImage, setDisplayImage] = useState<string | null>(null);
  const [webcamEnable, setWebcamEnable] = useState(false);

  const [width, setWidth] = useState(500);
  const [height, setHeight] = useState(500);

  const [captureInterval, setCaptureInterval] = useState(1000);
  const [autoCapture, setAutoCapture] = useState(false);

  const capture = async () => {
    const webcam = webcamRef.current;
    if (webcam === null) {
      alert("No camera");
      return;
    }

    const img = webcam.getScreenshot({ width: width, height: height });
    setDisplayImage(img);
  }

  const handleUpload = async (file: File) => {
    const img = await readBase64(file);
    setDisplayImage(img);
  }

  useEffect(() => {
    let captureTask: number | undefined;
    if (autoCapture && webcamEnable) {
      captureTask = window.setInterval(capture, captureInterval);
    }
    return () => window.clearInterval(captureTask);
  }, [autoCapture, webcamEnable, captureInterval]);

  return (
    <Stack direction="column" spacing={2}>
      <AppBar position='sticky'>
        <Toolbar>
          <Typography variant='h6' sx={{ flexGrow: 1 }}>Scan</Typography>

          <FormControlLabel
            control={<Switch color='secondary' checked={webcamEnable} onChange={() => setWebcamEnable(!webcamEnable)} />}
            label="Camera"
            sx={{ float: 'right' }}
          />
        </Toolbar>
      </AppBar>



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

      <Stack direction="row" spacing={2}>
        <Button variant="contained" onClick={capture} disabled={!webcamEnable}>capture</Button>
        <FormControlLabel control={
          <Switch value={autoCapture} onChange={() => setAutoCapture(x => !x)}></Switch>
        } label="Autocapture" disabled={!webcamEnable} />
        {autoCapture && <FormControlLabel control={
          <Slider value={captureInterval} min={33} max={1500}
            onChange={(_, val) => setCaptureInterval(val as number)} valueLabelDisplay='on'></Slider>
        } label="Capture interval" />
        }
      </Stack>
      <label>
        <input accept="image/*" type="file" hidden onChange={(ev) => handleUpload(ev.currentTarget.files![0])} />
        <Button variant="contained" component="span">Upload</Button>
      </label>
    </Stack >
  );
}

function processImage(image: Mat, options: { threshould: number }) {
  const gray = new cv.Mat();
  cv.cvtColor(image, gray, cv.COLOR_BGR2GRAY);

  const thres = new cv.Mat();
  cv.threshold(gray, thres, options.threshould, 255, cv.THRESH_BINARY);

  const cons = new cv.MatVector();
  const hir = new cv.Mat();
  cv.findContours(thres, cons, hir, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  for (let i = 0; i < cons.size(); i++) {
    const c = cons.get(i);
    const rect = cv.boundingRect(c);
    cv.rectangle(
      image,
      new cv.Point(rect.x, rect.y),
      new cv.Point(rect.x + rect.width, rect.y + rect.height),
      new cv.Scalar(255, 255, 0, 255),
      2
    )
  }

  return {
    gray, thres, cons, detected: image
  }
}


function CV(props: { img: string }) {
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasGrayRef = useRef<HTMLCanvasElement>(null);
  const canvasThresRef = useRef<HTMLCanvasElement>(null);
  const canvasDetectRef = useRef<HTMLCanvasElement>(null);

  const [threshould, setThreshould] = useState(190);
  const [objCount, setObjCount] = useState<number | null>(null);


  useEffect(() => {
    const task = async () => {
      await sleep(0);

      const image = cv.imread(imageRef.current!);

      const { gray, detected, thres, cons } = processImage(image, { threshould: threshould });

      cv.imshow(canvasGrayRef.current!, gray);
      cv.imshow(canvasThresRef.current!, thres);
      cv.imshow(canvasDetectRef.current!, detected);
      setObjCount(cons.size())
    };
    task();
  }, [props.img, threshould]);

  return <div>
    <Accordion>
      <AccordionSummary>
        <Typography>Original</Typography>
      </AccordionSummary>
      <img width={500} height={500} ref={imageRef} src={props.img}></img>
    </Accordion>
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


    <Slider
      value={threshould}
      min={0}
      max={255}
      valueLabelDisplay='on'
      onChange={(_, val) => setThreshould(val as number)}>
    </Slider>


  </div >;

}

export default App;
