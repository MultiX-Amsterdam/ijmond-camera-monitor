"""
Important: before running this script, you must run the following:
$ python add_videos.py ../data/video_dataset_1.json

The image segmentation dataset is created by using code in the following repository:
- https://github.com/MultiX-Amsterdam/ijmond-camera-ai/tree/main/samples_for_labelling
"""

from models.model_operations.segmentationMask_operations import create_segmentation
import json
import numpy as np
import sys
from app.app import app

# The priority of this batch of frames
PRIORITY = 1


def main(argv):
    if len(argv) > 1:
        with open(argv[1]) as f:
            data = np.array(json.load(f))
            for i in range(len(data)):
                # Note that the frame_timestamp here uses the one from the video
                # Notice that we have three levels here:
                # - The first level is the panorama, such as the original video on https://breathecam.multix.io/
                # - The second level is the video frame, which could be a frame of a video that is cropped from the panorama, or just the panorama itself
                # - The third level is the segmentation image, which could be an image that is cropped from the video frame, or just the video frame itself
                # The reason for such setup is for flexibility
                print("------------------------------------------------")
                mask_fn = data[i]["mask_file_name"] # file name of the segmentation mask
                img_fn = data[i]["crop_file_name"] # file name of the segmentation image
                f_nbr = data[i]["frame_number"] # the frame number in the original video
                v_id = data[i]["video_id"] # ID of the video on IJmondCAM https://ijmondcam.multix.io/
                relative_boxes = data[i]["relative_boxes"] # the bounding box location relative to the segmentation image
                x_bbox = relative_boxes["x"] # x coordinate of the top left corner of the box relative to the segmentation image
                y_bbox = relative_boxes["y"] # y coordinate of the top left corner of the box relative to the segmentation image
                w_bbox = relative_boxes["w"] # width of the box
                h_bbox = relative_boxes["h"] # height of the box
                img_w = data[i]["cropped_width"] # width of the segmentation image
                img_h = data[i]["cropped_height"] # height of the segmentation image
                pr = PRIORITY # images with a higher priority will be selected first for labeling
                fd = data[i]["mask_file_directory"] # directory to the segmentation mask and image files (with the root folder name)
                ft = data[i]["frame_timestamp"] # timestamp of the video frame
                ffn = data[i]["frame_file_name"] # file name of the video frame
                ffd = data[i]["frame_file_directory"] # directory to the video frame (with the root folder name)
                f_w = data[i]["image_width"] # width of the video frame
                f_h = data[i]["image_height"] # height of the video frame
                frame_boxes = data[i]["boxes"] # the bounding box location relative to the video frame
                x_bbox_f = frame_boxes["x"] # x coordinate of the top left corner of the box relative to the video frame
                y_bbox_f = frame_boxes["y"] # y coordinate of the top left corner of the box relative to the video frame
                w_bbox_f = frame_boxes["w"] # width of the box
                h_bbox_f = frame_boxes["h"] # height of the box
                num_f = data[i]["number_of_frames"] # number of frames in the original video
                x_img = data[i]["x_image"] # x coordinate of the top left corner of the segmentation image relative to the video frame
                y_img = data[i]["y_image"] # y coordinate of the top left corner of the segmentation image relative to the video frame
                with app.app_context():
                    seg = create_segmentation(mask_fn, img_fn, x_bbox, y_bbox, w_bbox, h_bbox,
                                                img_w, img_h, f_nbr, v_id, pr, fd, ft)
                    print(seg)
    else:
        print("Usage: python add_segment.py [segment_json_path]")
        print("Example: python add_segment.py ../data/segmentation_dataset_testing.json")
        print("Example: python add_segment.py ../data/segmentation_dataset_1.json")


if __name__ == "__main__":
    main(sys.argv)
