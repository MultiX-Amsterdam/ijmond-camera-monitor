# IJmond-video-dataset-2024-01-22

This dataset (the [metadata_ijmond_jan_22_2024.json](metadata_ijmond_jan_22_2024.json) file) is a snapshot of the database's state on January 22, 2024. It is released under the [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) license.

A lot of the code and documentation is borrowed from the [`deep-smoke-machine`](https://github.com/CMU-CREATE-Lab/deep-smoke-machine) repository.

### Table of Content
- [Explanation of the JSON file](#explanation-json)
- [Get video URLs and download videos](#get-video-url)
- [Explanation of label states](#explanation-label-state)

## <a name="explanation-json"></a>Explanation of the JSON file

The dataset JSON file contains an array, with each element in the array representing the metadata for a video. Each element is a dictionary with keys and values, explained below:
- camera_id
  - ID of the camera (0 means [`hoogovens`](https://www.youtube.com/watch?v=5cKPaRo-Ehs), 1 means [`kooksfabriek_1`](https://www.youtube.com/watch?v=8QJfCyoXXnM), and 2 means [`kooksfabriek_2`](https://www.youtube.com/watch?v=8pO1RQ4VAq4))
- view_id
  - ID of the cropped view from the camera
  - Each camera produces a panarama, and each view is cropped from this panarama (will be explained later)
- id
  - Unique ID of the video clip
- label_state
  - State of the video label produced by citizen science volunteers (will be explained later)
- label_state_admin
  - State of the video label produced by researchers (will be explained later)
- start_time
  - Starting epoch time (in seconds) when capturing the video, corresponding to the real-world time
  - For example, `1683997926`
- url_root
  - URL root of the video (need to be combined with others to create a full URL, explained later)
  - For example, `https://ijmondcam.multix.io/videos/`
- url_part
  - The final part of the URL in the YouTube video link that shows the panarama
  - For example, if url_part is `vQZz9ePv_vQ`, the panarama video URL is `https://www.youtube.com/watch?v=vQZz9ePv_vQ`
- file_name
  - File name of the video, for example "`vQZz9ePv_vQ`-`2`"
  - The format of the file_name is "`[url_part]`-`[view_id]`"

## <a name="get-video-url"></a>Get video URLs and download videos

To get the URL of the cropped video from a dictionary, use the Python function below:
```python
def get_video_url(v):
  """
  Get the video URL.

  Parameters
  ----------
  v : dict
      The dictionary with keys and values in the video dataset JSON file.

  Returns
  -------
  str
      The full URL of the video.
  """
  camera_names = ["hoogovens", "kooksfabriek_1", "kooksfabriek_2"]
  return v["url_root"] + camera_names[v["camera_id"]] + "/" +  v["url_part"] + "/" + v["file_name"] + ".mp4"
```

To get the URL of the original panarama video from a dictionary, use the Python function below:
```python
def get_video_panorama_url(v):
  """
  Get the video panorama URL.

  Parameters
  ----------
  v : dict
      The dictionary with keys and values in the video dataset JSON file.

  Returns
  -------
  str
      The full URL of the panorama video.
  """
  return "https://www.youtube.com/watch?v=" + v["url_part"]
```

The following Python code prints the URLs for all the cropped videos and the panoramas in the dataset:
```python
import json

# Specify the path to the JSON file
json_file_path = "metadata_ijmond_jan_22_2024.json"

# Open the file and load its contents into a dictionary
with open(json_file_path, "r") as json_file:
    data_dict = json.load(json_file)

# Print the video URLs
for v in data_dict:
  print(get_video_url(v))
  print(get_video_panorama_url(v))
```

To download the videos, run the [`download_videos.py`](download_videos.py) script in the terminal, which will create a `videos/` folder under the `ijmond-camera-monitor/dataset/2024-01-22/` path and then download the videos there.
```sh
python download_videos.py
```

## <a name="explanation-label-state"></a>Explanation of label states

Each video is reviewed by at least two citizen science volunteers or one researcher. [Our paper](https://ojs.aaai.org/index.php/AAAI/article/view/17739) describes the details of the labeling and quality control mechanism. The state of the label (`label_state` and `label_state_admin`) is briefly explained below.
- 47 : gold standard positive
  - The researcher assigned a positive label to the video and indicated that the video should be used as a gold standard for data quality checks.
- 32 : gold standard negative
  - The researcher assigned a negative label to the video and indicated that the video should be used as a gold standard for data quality checks.
- 23 : strong positive
  - Two volunteers both agree (or one researcher says) that the video has smoke.
- 16 : strong negative
  - Two volunteers both agree (or one researcher says) that the video does not have smoke.
- 19 : weak positive
  - Two volunteers have different answers, and the third volunteer says that the video has smoke.
- 20 : weak negative
  - Two volunteers have different answers, and the third volunteer says that the video does not have smoke.
- 5 : maybe positive
  - One volunteers says that the video has smoke.
- 4 : maybe negative
  - One volunteers says that the video does not have smoke.
- 3 : has discord
  - Two volunteers have different answers (one says yes, and another one says no).
- -1 : no data, no discord
  - No data. If label_state_admin is -1, it means that the label is produced solely by citizen science volunteers. If label_state is -1, it means that the label is produced solely by researchers. Otherwise, the label is jointly produced by both citizen science volunteers and researchers. Please refer to our paper about these three cases.
- -2 : bad videos
  - This means that reseachers have checked the data and marked the video as not suitable for labeling (e.g., due to bad data quality such as incorrect image stitching or artifacts during video compression). These bad videos should not be used in building the model.
