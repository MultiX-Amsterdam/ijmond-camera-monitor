#!/bin/sh

P=""
if [ "$2" != "" ]
then
  P="$2"
fi

E="staging"
if [ "$1" != "" ]
then
  E="$1"
fi

D=$(date +%m%d%Y)

if [ "$E" = "production" ]
then
  pg_dump -d ijmond_camera_monitor_production > "$P"ijmond_camera_monitor_production_"$D".out
elif [ "$E" = "staging" ]
then
  pg_dump -d ijmond_camera_monitor_staging > "$P"ijmond_camera_monitor_staging_"$D".out
fi
