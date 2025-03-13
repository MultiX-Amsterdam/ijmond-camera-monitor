(function () {
  "use strict";

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //
  // Create the class
  //
  var Util = function () {
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Variables
    //
    var ua = navigator.userAgent;
    var isChromeOS = ua.match(/CrOS/) != null;
    var isMobileDevice = !isChromeOS && (ua.match(/Android/i) || ua.match(/webOS/i) || ua.match(/iPhone/i) || ua.match(/iPad/i) || ua.match(/iPod/i) || ua.match(/BlackBerry/i) || ua.match(/Windows Phone/i) || ua.match(/Mobile/i)) != null;
    var isIOSDevice = ua.match(/iPad|iPhone|iPod/) != null;
    var matchIOSVersionString = ua.match(/OS (\d+)_(\d+)_?(\d+)?/);
    var isSupportedIOSVersion = isIOSDevice && parseInt(matchIOSVersionString[1]) >= 11;
    var isAndroidDevice = ua.match(/Android/) != null;
    var matchAndroidVersionString = ua.match(/Android (\d+(?:\.*\d*){1,2})/);
    var isSupportedAndroidVersion = isAndroidDevice && parseFloat(matchAndroidVersionString[1]) >= 7
    var isMSIEUserAgent = ua.match(/MSIE|Trident|Edge/) != null;
    var isOperaUserAgent = ua.match(/OPR/) != null;
    var isChromeUserAgent = ua.match(/Chrome/) != null && !isMSIEUserAgent && !isOperaUserAgent;
    var matchChromeVersionString = ua.match(/Chrome\/([0-9.]+)/);
    var isSupportedChromeMobileVersion = matchChromeVersionString && matchChromeVersionString.length > 1 && parseInt(matchChromeVersionString[1]) >= 73;
    var isSamsungInternetUserAgent = ua.match(/SamsungBrowser/) != null;
    var isIEEdgeUserAgent = !!(isMSIEUserAgent && ua.match(/Edge\/([\d]+)/));

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Private methods
    //

    // This code is from https://github.com/CMU-CREATE-Lab/timemachine-viewer/blob/master/js/org/gigapan/util.js
    function isMobileSupported() {
      /* The following mobile browsers do not currently support autoplay of videos:
       *   - Samsung Internet (Last checked Mar 2019)
       */
      var isSupported = false;
      if (isMobileDevice && (isSupportedIOSVersion || isSupportedAndroidVersion)) {
        isSupported = true;
        if ((isChromeUserAgent && !isSupportedChromeMobileVersion) || isSamsungInternetUserAgent) {
          isSupported = false;
        }
      }
      return isSupported;
    }

    // Calculate the bounding box based on the given meta data
    function calculateBBox(meta_data, $container, border_size) {
      const img_width = meta_data["w_image"];
      const img_height = meta_data["h_image"];

      const x = meta_data["x_bbox"];
      const y = meta_data['y_bbox'];
      const w = meta_data['w_bbox'];
      const h = meta_data['h_bbox'];

      const container_w = $container.width();
      const container_h = $container.height();

      const box_x = (x / img_width) * container_w
      const box_y = (y / img_height) * container_h
      const box_w = (w / img_width) * container_w
      const box_h = (h / img_height) * container_h

      return {
        left: border_size + box_x,
        top: border_size + box_y,
        width: box_w,
        height: box_h
      };
    }

    // Create resizers for the boundary box
    // Touch is used for phone
    // Mouse is used for desktop
    function createResizer($bbox, $container, border_size) {
      const $topLeftBox = $('<div class="resizer top-left"></div>');
      const $topRightBox = $('<div class="resizer top-right"></div>');
      const $bottomLeftBox = $('<div class="resizer bottom-left"></div>');
      const $bottomRightBox = $('<div class="resizer bottom-right"></div>');

      const MIN_WIDTH = 20;
      const MIN_HEIGHT = 20;

      let start_width, start_height;
      let start_x, start_y;
      let start_top, start_left;
      let current_left, current_top;
      let current_width, current_height;
      let div_size, previous_div_size;
      let isDragging = false;

      // Add cursor style for dragging
      $bbox.css('cursor', 'move');

      function startDragging(e) {
        e.preventDefault();
        isDragging = true;

        // Get initial positions
        start_x = e.clientX || e.touches[0].clientX;
        start_y = e.clientY || e.touches[0].clientY;

        var position = $bbox.position();
        start_left = position.left;
        start_top = position.top;
        current_left = position.left;
        current_top = position.top;

        // Add event listeners for dragging
        document.addEventListener('mousemove', handleDrag);
        document.addEventListener('touchmove', handleDrag);
        document.addEventListener('mouseup', stopDragging);
        document.addEventListener('touchend', stopDragging);

        // Indicate that the user has interacted with the bounding box
        $bbox.data("interacted", true);
      }

      function handleDrag(e) {
        if (!isDragging) return;

        const client_x = e.clientX || e.touches[0].clientX;
        const client_y = e.clientY || e.touches[0].clientY;

        // Calculate the movement deltas
        const delta_x = client_x - start_x;
        const delta_y = client_y - start_y;

        // Calculate new position
        let new_left = start_left + delta_x;
        let new_top = start_top + delta_y;

        // Get container boundaries
        const container_width = $container.width();
        const container_height = $container.height();

        // Constrain to container boundaries
        new_left = Math.max(border_size, Math.min(new_left, container_width - $bbox.width() + border_size));
        new_top = Math.max(border_size, Math.min(new_top, container_height - $bbox.height() + border_size));

        // Update position
        $bbox.css({
          left: new_left + 'px',
          top: new_top + 'px'
        });

        current_left = new_left;90
        current_top = new_top;
      }

      function stopDragging() {
        isDragging = false;
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('touchmove', handleDrag);
        document.removeEventListener('mouseup', stopDragging);
        document.removeEventListener('touchend', stopDragging);
      }

      // Add drag event listeners to the bbox (but not to resizer corners)
      $bbox.on('mousedown', function(e) {
        // Only start dragging if the click is on the box itself, not on a resizer
        if (!$(e.target).hasClass('resizer')) {
          startDragging(e);
        }
      });

      $bbox.on('touchstart', function(e) {
        // Only start dragging if the touch is on the box itself, not on a resizer
        if (!$(e.target).hasClass('resizer')) {
          startDragging(e);
        }
      });

      function updateContainerSize() {
        previous_div_size = div_size;
        div_size = {
          width: $container.width(),
          height: $container.height()
        };

        // Adjust box position and size when the container size changes
        adjustBoxToContainer();
      }

      // Function to adjust box size and position based on the new container size
      function adjustBoxToContainer() {
        if (!previous_div_size) return; // No need to adjust on the first load

        // Calculate scale factors based on the change in container size
        const widthScale = (div_size.width - border_size) / (previous_div_size.width - border_size);
        const heightScale = (div_size.height - border_size) / (previous_div_size.height - border_size);

        // Recalculate new width, height, top, and left positions for the box
        current_width = ($bbox.width() - border_size) * widthScale + border_size;
        current_height = ($bbox.height() - border_size) * heightScale + border_size;
        current_left = ($bbox.position().left - border_size) * widthScale + border_size;
        current_top = ($bbox.position().top - border_size) * heightScale + border_size;

        // Apply the new dimensions and positions to the box
        $bbox.css({
          width: current_width + 'px',
          height: current_height + 'px',
          left: current_left + 'px',
          top: current_top + 'px'
        });
      }

      function handlerTopRightMovement(e) {
        const client_x = e.clientX || e.touches[0].clientX;
        const client_y = e.clientY || e.touches[0].clientY;

        // Get container boundaries
        const container_rect = $container[0].getBoundingClientRect();
        const container_left = container_rect.left;
        const container_right = container_rect.right;
        const container_top = container_rect.top;
        const container_bottom = container_rect.bottom;

        // Constrain client coordinates
        const constrained_client_x = Math.max(container_left, Math.min(client_x, container_right));
        const constrained_client_y = Math.max(container_top, Math.min(client_y, container_bottom));

        // Calculate movement deltas
        const delta_x = constrained_client_x - start_x;
        const delta_y = constrained_client_y - start_y;

        // Calculate new dimensions while keeping the left edge fixed
        const new_width = start_width + delta_x;
        current_width = Math.max(Math.min(new_width, $container.width() - current_left + border_size), MIN_WIDTH);

        // Calculate new top position and height while keeping bottom edge fixed
        const bottom_edge = start_top + start_height;
        current_top = Math.min(Math.max(start_top + delta_y, border_size), bottom_edge - MIN_HEIGHT);
        current_height = bottom_edge - current_top;

        // Update the box dimensions
        $bbox.css({
          width: current_width + 'px',
          height: current_height + 'px',
          top: current_top + 'px'
        });
      }

      function handlerBottomLeftMovement(e) {
        const client_x = e.clientX || e.touches[0].clientX;
        const client_y = e.clientY || e.touches[0].clientY;

        // Get container boundaries
        const container_rect = $container[0].getBoundingClientRect();
        const container_left = container_rect.left;
        const container_right = container_rect.right;
        const container_top = container_rect.top;
        const container_bottom = container_rect.bottom;

        // Constrain client coordinates
        const constrained_client_x = Math.max(container_left, Math.min(client_x, container_right));
        const constrained_client_y = Math.max(container_top, Math.min(client_y, container_bottom));

        // Calculate movement deltas
        const delta_x = constrained_client_x - start_x;
        const delta_y = constrained_client_y - start_y;

        // Calculate new left position and width while keeping right edge fixed
        const right_edge = start_left + start_width;
        current_left = Math.min(Math.max(start_left + delta_x, border_size), right_edge - MIN_WIDTH);
        current_width = right_edge - current_left;

        // Calculate new height while keeping top edge fixed
        const new_height = start_height + delta_y;
        current_height = Math.max(Math.min(new_height, $container.height() - current_top + border_size), MIN_HEIGHT);

        // Update the box dimensions
        $bbox.css({
          width: current_width + 'px',
          height: current_height + 'px',
          left: current_left + 'px'
        });
      }

      function handlerBottomRightMovement(e) {
        // Calculates the new width and height of the box based on the movement
        const client_x = e.clientX || e.touches[0].clientX;
        const client_y = e.clientY || e.touches[0].clientY;

        // Determine the new dimensions based on the initial state
        const new_width = start_width + (client_x - start_x);
        const new_height = start_height + (client_y - start_y);

        // Prevent moving out of boundaries
        const magic_max_width = $container.width() - current_left + border_size;
        const magic_max_height = $container.height() - current_top + border_size;
        current_width = Math.max(Math.min(new_width, magic_max_width), MIN_WIDTH);
        current_height = Math.max(Math.min(new_height, magic_max_height), MIN_HEIGHT);

        // Update the width and height of the box without exceeding the image size
        $bbox.css({
          width: current_width + 'px',
          height: current_height + 'px'
        });
      }

      function handlerTopLeftMovement(e) {
        // Calculates the new width and height of the box based on the movement
        const client_x = e.clientX || e.touches[0].clientX;
        const client_y = e.clientY || e.touches[0].clientY;

        // Get container boundaries in client coordinates
        const container_rect = $container[0].getBoundingClientRect();
        const container_left = container_rect.left;
        const container_right = container_rect.right;
        const container_top = container_rect.top;
        const container_bottom = container_rect.bottom;

        // Constrain client coordinates to container boundaries
        const constrained_client_x = Math.max(container_left, Math.min(client_x, container_right));
        const constrained_client_y = Math.max(container_top, Math.min(client_y, container_bottom));

        // Calculate movement deltas
        const delta_x = constrained_client_x - start_x;
        const delta_y = constrained_client_y - start_y;

        // Calculate new dimensions while keeping the right and bottom edges fixed
        const right_edge = start_left + start_width;
        const bottom_edge = start_top + start_height;

        // Calculate new left position, ensuring it doesn't go beyond the right edge minus minimum width
        const max_left = right_edge - MIN_WIDTH;
        current_left = Math.min(Math.max(start_left + delta_x, border_size), max_left);

        // Calculate new top position, ensuring it doesn't go beyond the bottom edge minus minimum height
        const max_top = bottom_edge - MIN_HEIGHT;
        current_top = Math.min(Math.max(start_top + delta_y, border_size), max_top);

        // Calculate width and height based on fixed right/bottom edges
        current_width = right_edge - current_left;
        current_height = bottom_edge - current_top;

        // Update the box position and dimensions
        $bbox.css({
          width: current_width + 'px',
          height: current_height + 'px',
          left: current_left + 'px',
          top: current_top + 'px'
        });
      }

      // Add event listeners when the user interacts with the bbox (resizing starts)
      function addListener(handler) {
        document.addEventListener('mousemove', handler);
        document.addEventListener('mouseup', removeListener);
        document.addEventListener('touchmove', handler);
        document.addEventListener('touchend', removeListener);
      }

      // Remove event listeners to stop resizing
      function removeListener() {
        document.removeEventListener('mousemove', handlerTopLeftMovement);
        document.removeEventListener('mousemove', handlerTopRightMovement);
        document.removeEventListener('mousemove', handlerBottomLeftMovement);
        document.removeEventListener('mousemove', handlerBottomRightMovement);
        document.removeEventListener('touchmove', handlerTopLeftMovement);
        document.removeEventListener('touchmove', handlerTopRightMovement);
        document.removeEventListener('touchmove', handlerBottomLeftMovement);
        document.removeEventListener('touchmove', handlerBottomRightMovement);
        document.removeEventListener('mouseup', removeListener);
        document.removeEventListener('touchend', removeListener);
      }

      // Initializes the resizing process
      function startResizing(e, handler) {
        e.preventDefault();

        start_x = e.clientX || e.touches[0].clientX;
        start_y = e.clientY || e.touches[0].clientY;

        var position = $bbox.position();
        start_width = $bbox.width();
        start_height = $bbox.height();
        start_left = position.left;
        start_top = position.top;
        current_left = position.left;
        current_top = position.top;

        addListener(handler);

        // Indicate that the user has interacted with the bounding box
        $bbox.data("interacted", true);
      }

      // Attach the event listeners
      $topLeftBox[0].addEventListener('mousedown', (e) => startResizing(e, handlerTopLeftMovement));
      $topLeftBox[0].addEventListener('touchstart', (e) => startResizing(e, handlerTopLeftMovement));

      $topRightBox[0].addEventListener('mousedown', (e) => startResizing(e, handlerTopRightMovement));
      $topRightBox[0].addEventListener('touchstart', (e) => startResizing(e, handlerTopRightMovement));

      $bottomLeftBox[0].addEventListener('mousedown', (e) => startResizing(e, handlerBottomLeftMovement));
      $bottomLeftBox[0].addEventListener('touchstart', (e) => startResizing(e, handlerBottomLeftMovement));

      $bottomRightBox[0].addEventListener('mousedown', (e) => startResizing(e, handlerBottomRightMovement));
      $bottomRightBox[0].addEventListener('touchstart', (e) => startResizing(e, handlerBottomRightMovement));

      // Add window resize event listener to recalculate div_size
      window.addEventListener('resize', updateContainerSize);

      // Call it once initially to set div_size
      updateContainerSize();

      return [$topLeftBox, $topRightBox, $bottomLeftBox, $bottomRightBox];
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Privileged methods
    //

    // Safely get the value from a variable, return a default value if undefined
    var safeGet = function (v, default_val) {
      if (typeof default_val === "undefined") default_val = "";
      return (typeof v === "undefined") ? default_val : v;
    };
    this.safeGet = safeGet;

    // Get the the root url of the API
    var getRootApiUrl = function () {
      var root_url;
      var url_hostname = window.location.hostname;
      var is_localhost = url_hostname.indexOf("localhost");
      var is_staging = url_hostname.indexOf("staging");
      var is_testing = url_hostname.indexOf("192.168");
      if (is_localhost >= 0 || is_testing >= 0) {
        root_url = "http://" + url_hostname + ":8888/api/v1/";
      } else {
        if (is_staging >= 0) {
          root_url = "https://staging.api.ijmondcam.multix.io/api/v1/";
        } else {
          root_url = "https://api.ijmondcam.multix.io/api/v1/";
        }
      }
      return root_url;
    };
    this.getRootApiUrl = getRootApiUrl;

    // Play or pause the videos properly
    // See https://developers.google.com/web/updates/2017/06/play-request-was-interrupted
    var handleVideoPromise = function (video, actionType, error_callback) {
      if (!video) return;
      if (actionType == "play" && video.paused && !video.playPromise) {
        if (video.readyState > 1) {
          video.playPromise = video.play();
        } else {
          // Do not add a new timeout if already exists
          if (!video.handle_video_promise_timeout) {
            console.warn("This video is not ready to play, will try later.");
            if (typeof video.retry_times === "undefined") {
              video.retry_times = 0
            }
            clearTimeout(video.handle_video_promise_timeout);
            video.handle_video_promise_timeout = setTimeout(function () {
              video.handle_video_promise_timeout = null;
              video.retry_times += 1;
              if (video.retry_times <= 3) {
                handleVideoPromise(video, actionType, error_callback);
              } else {
                video.retry_times = 0
                handleVideoPromise(video, "load", error_callback);
              }
            }, 1000);
          }
          return;
        }
      }
      // HTML5 video does not return Promises in <= IE 11, so we create a fake one.
      // Also note that <= IE11 does not support Promises, so we need to include a polyfill.
      if (isMSIEUserAgent && !isIEEdgeUserAgent) {
        video.playPromise = Promise.resolve(true);
      }
      if (video.playPromise !== undefined) {
        video.playPromise.then(function (_) {
          if (actionType == "pause" && video.played.length && !video.paused) {
            video.pause();
          } else if (actionType == "load") {
            video.load();
          }
          if (actionType != "play") {
            video.playPromise = undefined;
          }
        }).catch(function (error) {
          console.error(error.name, error.message);
          if (typeof error_callback === "function") error_callback();
        });
      }
    };
    this.handleVideoPromise = handleVideoPromise;

    // Create a bounding box element
    var createBBox = function (meta_data, $container, hide_resizer, feedback_code, border_size) {
      const $bbox = $('<div class="bbox"></div>');
      const adjusted_data = calculateBBox(meta_data, $container, border_size);

      // Save the metadata to the data field
      $bbox.data("metadata", meta_data);

      // Indicate whether the user interacted with this bounding box or not
      $bbox.data("interacted", false);

      // Save the container object
      $bbox.data("container", $container);

      // Update the bounding box style based on the bbox object
      $bbox.css({
        left: adjusted_data.left + 'px',
        top: adjusted_data.top + 'px',
        width: adjusted_data.width + 'px',
        height: adjusted_data.height + 'px'
      });
      if (feedback_code == 3 || feedback_code == 4 || feedback_code == 5) {
        // Researcher labels
        $bbox.addClass("researcher");
      } else if (feedback_code == 16 || feedback_code == 17 || feedback_code == 18) {
        // Gold standards
        $bbox.addClass("researcher"); // we need this, do not delete this line
        $bbox.addClass("gold-standard");
      }

      // Add the resizer
      const resize_boxes = createResizer($bbox, $container, border_size);
      $bbox.append(resize_boxes[0]);
      $bbox.append(resize_boxes[1]);
      $bbox.append(resize_boxes[2]);
      $bbox.append(resize_boxes[3]);
      if (hide_resizer == true) {
        resize_boxes[0].hide();
        resize_boxes[1].hide();
        resize_boxes[2].hide();
        resize_boxes[3].hide();
      }

      return $bbox;
    };
    this.createBBox = createBBox;

    // Revert the bounding box calculation
    var reverseBBox = function ($bbox, border_size) {
      const meta_data = $bbox.data("metadata");
      const img_width = meta_data["w_image"];
      const img_height = meta_data["h_image"];
      const position = $bbox.position();

      const $container = $bbox.data("container");
      const container_w = $container.width();
      const container_h = $container.height();

      // Reverse calculations to get back the original image's coordinates
      var x_bbox = Math.round(((position.left - border_size) / container_w) * img_width);
      var y_bbox = Math.round(((position.top - border_size) / container_h) * img_height);
      var w_bbox = Math.round(($bbox.width() / container_w) * img_width);
      var h_bbox = Math.round(($bbox.height() / container_h) * img_height);

      // Sometimes after resizing the browser window, the value can be -0, but we want 0
      x_bbox = (x_bbox == -0) ? 0 : x_bbox;
      y_bbox = (y_bbox == -0) ? 0 : y_bbox;
      w_bbox = (w_bbox == -0) ? 0 : w_bbox;
      h_bbox = (h_bbox == -0) ? 0 : h_bbox;

      return {
        x_bbox: x_bbox,
        y_bbox: y_bbox,
        w_bbox: w_bbox,
        h_bbox: h_bbox
      };
    };
    this.reverseBBox = reverseBBox;

    // Unpack the parameters in the search query in the URL
    var unpackVars = function (str) {
      var vars = {};
      if (str) {
        var keyvals = str.split(/[#?&]/);
        for (var i = 0; i < keyvals.length; i++) {
          var keyval = keyvals[i].split('=');
          vars[keyval[0]] = keyval[1];
        }
      }
      // Delete null/undefined values
      Object.keys(vars).forEach(function (key) {
        return (vars[key] == null || key == "") && delete vars[key];
      });
      return vars;
    };
    this.unpackVars = unpackVars;

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Public methods
    //

    // Build the original video panarama URL from the segmentation feedback data
    this.segmentationFeedbackToVideoPanoramaURL = function (v) {
      var parts = v["file_path"].split("/")[1].split("-");
      parts.pop();
      var src_url = "https://www.youtube.com/watch?v=" + parts.join("-");
      return src_url;
    };

    // Build the original video panarama URL
    this.buildVideoPanoramaURL = function (v) {
      var src_url = "https://www.youtube.com/watch?v=" + v["url_part"];
      return src_url;
    };

    // Build the video URL from server returned data
    // Example: https://ijmondcam.multix.io/videos/hoogovens/bu7USw70eXs/bu7USw70eXs-0.mp4
    this.buildVideoURL = function (v) {
      var camera_names = ["hoogovens", "kooksfabriek_1", "kooksfabriek_2"];
      var src_url = v["url_root"] + camera_names[v["camera_id"]] + "/" + v["url_part"] + "/" + v["file_name"] + ".mp4";
      return src_url;
    };

    // Buid the segmentation URL from server returned data
    // Example: https://ijmondcam.multix.io/videos/bbox_batch_1/6GEzAlK09pI-1/15/6GEzAlK09pI-1-15-0/crop_with_bbox.png
    this.buildSegmentationURL = function (v) {
      var src_url = v["url_root"] + v["file_path"] + v["image_file_name"].replace("crop.png", "crop_with_bbox.png");
      return src_url;
    }

    // Post JSON
    this.postJSON = function (url, data, callback) {
      callback = safeGet(callback, {});
      $.ajax({
        url: url,
        type: "POST",
        data: JSON.stringify(data),
        contentType: "application/json",
        dataType: "json",
        success: function (data) {
          if (typeof callback["success"] === "function") callback["success"](data);
        },
        error: function (xhr) {
          if (typeof callback["error"] === "function") callback["error"](xhr);
        },
        complete: function () {
          if (typeof callback["complete"] === "function") callback["complete"]();
        }
      });
    };

    // Generate a unique id
    this.getUniqueId = function () {
      // The prefix "uuid" is used for identifying that the client id is generated from this function
      return "uuid." + new Date().getTime() + "." + Math.random().toString(36).substring(2);
    };

    // Download json data as a file
    this.downloadJSON = function (data, file_name) {
      var blob = new Blob([JSON.stringify(data)], {
        type: "application/json"
      });
      var link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    // Read the payload in a JWT
    this.getJwtPayload = function (jwt) {
      return JSON.parse(window.atob(jwt.split('.')[1]));
    };

    // Login to the smoke labeling tool
    this.login = function (post_json, callback) {
      callback = safeGet(callback, {});
      var user_data = window.localStorage.getItem("user_data");
      if (user_data != null) {
        user_data = JSON.parse(user_data);
        if (typeof callback["success"] === "function") callback["success"](user_data);
        if (typeof callback["complete"] === "function") callback["complete"]();
      } else {
        $.ajax({
          url: getRootApiUrl() + "login",
          type: "POST",
          data: JSON.stringify(post_json),
          contentType: "application/json",
          dataType: "json",
          success: function (data) {
            // We only want to add the user data when we know that the user has signed in with Google.
            // Otherwise we store the Google Analytics user data and reuse it, which is wrong.
            if (window.localStorage.getItem("google_id_token") != null) {
              window.localStorage.setItem("user_data", JSON.stringify(data));
            }
            if (typeof callback["success"] === "function") callback["success"](data);
          },
          error: function (xhr) {
            if (typeof callback["error"] === "function") callback["error"](xhr);
          },
          complete: function () {
            if (typeof callback["complete"] === "function") callback["complete"]();
          }
        });
      }
    };

    // Check if a string contains a substring
    this.hasSubString = function (str, sub_str) {
      return str.indexOf(sub_str) !== -1;
    };

    // Parse variables in the format of a hash url string
    this.parseVars = function (str, keep_null_or_undefined_vars) {
      var vars = {};
      if (str) {
        var keyvals = str.split(/[#?&]/);
        for (var i = 0; i < keyvals.length; i++) {
          var keyval = keyvals[i].split('=');
          vars[keyval[0]] = keyval[1];
        }
      }
      // Delete keys with null/undefined values
      if (!keep_null_or_undefined_vars) {
        Object.keys(vars).forEach(function (key) {
          return (vars[key] == null || key == "") && delete vars[key];
        });
      }
      return vars;
    };

    // This code is from https://github.com/CMU-CREATE-Lab/timemachine-viewer/blob/master/js/org/gigapan/util.js
    this.browserSupported = function () {
      var v = document.createElement('video');

      // Restrictions on which mobile devices work
      if (isMobileDevice && !isMobileSupported()) return false;

      // Check if the video tag is supported
      if (!!!v.canPlayType) return false;

      // See what video formats are actually supported
      var supportedMediaTypes = [];
      if (!!v.canPlayType('video/webm; codecs="vp8"').replace(/no/, '')) {
        supportedMediaTypes.push(".webm");
      }
      if (!!v.canPlayType('video/mp4; codecs="avc1.42E01E, mp4a.40.2"').replace(/no/, '')) {
        supportedMediaTypes.push(".mp4");
      }

      // The current video format returned by the database is mp4, and is the only supported format now
      if (supportedMediaTypes.indexOf(".mp4") < 0) return false;

      // The viewer is supported by the browser
      return true;
    };

    // Is a DOM element on screen
    this.isScrolledIntoView = function (elem) {
      var docViewTop = $(window).scrollTop();
      var docViewBottom = docViewTop + $(window).height();

      var elemTop = $(elem).offset().top;
      var elemBottom = elemTop + $(elem).height();

      return ((docViewTop < elemBottom) && (elemTop < docViewBottom));
    };

    // Update label statistics for videos
    this.updateLabelStatistics = function () {
      $.getJSON(getRootApiUrl() + "get_label_statistics", function (data) {
        var num_all_videos = data["num_all_videos"];
        $(".num-all-videos-text").text(num_all_videos);
        var num_fully_labeled = data["num_fully_labeled"];
        var num_fully_labeled_p = Math.round(num_fully_labeled / num_all_videos * 10000) / 100;
        $(".num-fully-labeled-text").text(num_fully_labeled + " (" + num_fully_labeled_p + "%)");
        var num_partially_labeled = data["num_partially_labeled"];
        var num_partially_labeled_p = Math.round(num_partially_labeled / num_all_videos * 10000) / 100;
        $(".num-partially-labeled-text").text(num_partially_labeled + " (" + num_partially_labeled_p + "%)");
        $("#label-statistics").show();
      });
    };

    // Update label statistics for segmentation masks
    this.updateLabelStatisticsSegmentation = function () {
      $.getJSON(getRootApiUrl() + "get_label_statistics_seg", function (data) {
        var num_all_masks = data["num_all_masks"];
        $(".num-all-masks-text").text(num_all_masks);
        var num_fully_labeled = data["num_fully_labeled"];
        var num_fully_labeled_p = Math.round(num_fully_labeled / num_all_masks * 10000) / 100;
        $(".num-fully-labeled-text").text(num_fully_labeled + " (" + num_fully_labeled_p + "%)");
        var num_partially_labeled = data["num_partially_labeled"];
        var num_partially_labeled_p = Math.round(num_partially_labeled / num_all_masks * 10000) / 100;
        $(".num-partially-labeled-text").text(num_partially_labeled + " (" + num_partially_labeled_p + "%)");
        $("#label-statistics").show();
      });
    };

    // Resolve promises and call back
    this.resolvePromises = function (promises, callback) {
      callback = safeGet(callback, {});
      $.when.apply($, promises).done(function () {
        if (typeof callback["success"] === "function") callback["success"]();
      }).fail(function (xhr) {
        if (typeof callback["error"] === "function") callback["error"](xhr);
      })
    };

    // Randomize array element order in-place
    // Using Durstenfeld shuffle algorithm with O(n) time complexity
    this.shuffleArrayInPlace = function (array) {
      for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
      }
      return array;
    };

    // iOS 13 Safari did not clear the video tags before switching to a different page.
    // If we toggle between two pages that both have 16 videos for several times
    // , the video tags will break and give media error code 3 MEDIA_ERR_DECODE.
    // To prevent this, we need to manually clear these video tags before leaving the page.
    this.addVideoClearEvent = function () {
      window.addEventListener("pagehide", event => {
        $("video").each(function () {
          this.pause();
          this.src = "";
        });
      }, false);
    };

    // Get the Android version on the device
    this.getAndroidVersion = function () {
      if (isAndroidDevice) {
        return parseFloat(matchAndroidVersionString[1]);
      }
    };

    // Is mobile device
    this.isMobile = function () {
      return isMobileDevice;
    };

    // Check if user consent is valid or expired
    this.checkUserConsent = function () {
      const consentTime = localStorage.getItem("userConsentTime");
      if (consentTime) {
        const now = Date.now();
        const oneYearInMs = 365 * 24 * 60 * 60 * 1000;
        if (now - consentTime < oneYearInMs) {
          // Consent is still valid
          return true;
        } else {
          // Consent is expired
          localStorage.removeItem("userConsentTime");
          return false;
        }
      }
      // If no consent time is stored, this means no user consent
      return false;
    };

    // Create the user consent dialog
    this.createUserConsentDialog = function (after_action) {
      var widgets = new edaplotjs.Widgets();
      $("#dialog-consent").remove();
      $("<div>", {
        "id": "dialog-consent",
        "title": "Toestemming",
        "data-role": "none",
        "html": "<p>We hebben uw toestemming nodig om Google Analytics anoniem te gebruiken om de kwaliteit van de gegevens te controleren en de labels van meerdere gebruikers te combineren (<a href='consent.html'>lees meer</a>).</p>"
      }).appendTo("body");
      var $dialog_consent = widgets.createCustomDialog({
        selector: "#dialog-consent",
        action_text: "Ik ga akkoord",
        reverse_button_positions: true,
        show_close_button: false,
        full_width_button: true,
        close_dialog_on_cancel: false,
        action_callback: function () {
          localStorage.setItem("userConsentTime", Date.now());
          if (typeof after_action === "function") {
            after_action();
          }
        },
        cancel_text: "Nee, ga naar homepage",
        cancel_callback: function () {
          window.location.href = "index.html";
        }
      });
      return $dialog_consent;
    };

    // Create the user consent management dialog
    this.createUserConsentManagementDialog = function (after_action) {
      var widgets = new edaplotjs.Widgets();
      const consentTime = localStorage.getItem("userConsentTime");
      var dialogHTML;
      if (consentTime) {
        const dateObject = new Date(parseInt(consentTime));
        dialogHTML = "<p>U heeft op " + dateObject.toLocaleString() + " toestemming gegeven (<a href='consent.html'>lees meer</a>).</p>"
      } else {
        dialogHTML = "<p>U heeft geen toestemming gegeven (<a href='consent.html'>lees meer</a>).</p>"
      }
      $("#dialog-consent-manage").remove();
      $("<div>", {
        "id": "dialog-consent-manage",
        "title": "Toestemming",
        "data-role": "none",
        "html": dialogHTML
      }).appendTo("body");
      var $dialog_consent_manage;
      if (consentTime) {
        $dialog_consent_manage = widgets.createCustomDialog({
          selector: "#dialog-consent-manage",
          action_text: "Toestemming intrekken",
          full_width_button: true,
          action_callback: function () {
            localStorage.removeItem("userConsentTime");
            if (typeof after_action === "function") {
              after_action();
            }
          },
          cancel_text: "Niets doen"
        });
      } else {
        $dialog_consent_manage = widgets.createCustomDialog({
          selector: "#dialog-consent-manage",
          has_action_callback: false,
          full_width_button: true,
          cancel_text: "Niets doen"
        });
      }
      return $dialog_consent_manage;
    };

    // Get the parameters from the query string
    this.getQueryParas = function () {
      return unpackVars(window.location.search);
    };
  };

  ////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //
  // Register to window
  //
  if (window.edaplotjs) {
    window.edaplotjs.Util = Util;
  } else {
    window.edaplotjs = {};
    window.edaplotjs.Util = Util;
  }
})();