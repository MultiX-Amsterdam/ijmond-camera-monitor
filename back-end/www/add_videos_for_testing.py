from models.model_operations.video_operations import create_video
import json
import numpy as np
import sys
from app.app import app

def main(argv):
    if len(argv) > 1:
        if argv[1] == "confirm":
            with open("../data/videos_for_testing.json") as f:
                data = np.array(json.load(f))
            for i in range(len(data)):
                print("------------------------------------------------")
                fn = data[i]["file_name"]
                st = 1
                et = 1
                up = data[i]["url_part"]
                l = 1
                r = 1
                t = 1
                b = 1
                vid = data[i]["view_id"]
                cid = data[i]["camera_id"]
                with app.app_context():
                    video = create_video(fn, st, et, up, l, r, t, b, vid, cid)
                    print(video)
        else:
            print("Must confirm by running: python add_videos_for_testing.py confirm")
    else:
        print("Must confirm by running: python add_videos_for_testing.py confirm")


if __name__ == "__main__":
    main(sys.argv)