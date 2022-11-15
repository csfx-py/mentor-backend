# Backend for mentor space project that manages api for auth and serve hotel menu using express/mongoose

## Clone app

clone the repo using `git clone https://github.com/csfx-py/mentor-backend.git` and cd over to the folder

## Install dependencies

You install dependencies with `yarn` or `npm i` 

## Prep for needed sensitive data

add a .env file in root of the app using `touch .env`

add `MONGO_LOCAL` for connecting mongo db dev,

add `MONGO_URI` for connecting mongo db prod,

`ACCESS_TOKEN_SEC` for jwt secret

`FIREBASE_API_KEY` `FIREBASE_AUTH_DOMAIN` `FIREBASE_PROJECT_ID` `FIREBASE_STORAGE_BUCKET` `FIREBASE_MESSAGING_SENDER_ID` `FIREBASE_APP_ID` `FIREBASE_MEASUREMENT_ID` for firebase config

## Run app

You can run the app with `yarn dev` or `npm run dev`