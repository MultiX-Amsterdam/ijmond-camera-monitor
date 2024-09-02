(function () {
    "use strict";

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Create the class
    //
    var BboxLabelingTool = function (container_selector, settings) {
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////
        //
        // Variables
        //
        var util = new edaplotjs.Util();
        settings = safeGet(settings, {});
        var $container = $(container_selector);
        var $tool;
        var $tool_videos;
        var video_items = [];
        //var $bad_video_text = $('<span class="bad-video-text">Oops!<br>Some video links are broken.<br>Please refresh this page.</span>');
        var $bad_video_text = $('<span class="bad-video-text">Error!<br>Het ziet ernaar uit dat sommige video\'s niet werken.<br>Laat deze pagina opnieuw in alstublieft.</span>');
        //var $error_text = $('<span class="error-text">Oops!<br>Server may be down or busy.<br>Please come back later.</span>');
        var $error_text = $('<span class="error-text">Error!<br>Het ziet ernaar uit dat de server druk is.<br>Komt alstublieft later terug.</span>');
        //var $no_data_text = $('<span class="no-data-text">Thank you!<br>Videos are all labeled.<br>Please come back later.</span>');
        var $no_data_text = $('<span class="no-data-text">Dankjewel!<br>Op dit moment zijn alle video\'s gelabeld.<br>Kom alstublieft later nog terug.</span>');
        var $loading_text = $('<span class="loading-text"></span>');
        //var $not_supported_text = $('<span class="not-supported-text">We are sorry!<br>Your browser is not supported.</span>');
        var $not_supported_text = $('<span class="not-supported-text">Onze excuses!<br>De browser ondersteunt deze website helaas niet.</span>');
        var api_url_root = util.getRootApiUrl();
        var user_id;
        var video_token;
        var user_token;
        var this_obj = this;
        var user_score;
        var user_raw_score;
        var on_user_score_update = settings["on_user_score_update"];
        var is_admin;

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////
        //
        // Private methods
        //
        function init() {
            $tool = $('<div class="video-labeling-tool"></div>');
            $tool_videos = $('<div class="video-labeling-tool-videos"></div>');
            $container.append($tool.append($tool_videos));
            showLoadingMsg();
        }

        // Get the user id from the server
        function login(post_json, callback) {
            callback = safeGet(callback, {});
            util.login(post_json, {
                success: function (data) {
                    if (typeof callback["success"] === "function") callback["success"](data);
                },
                error: function (xhr) {
                    console.error("Error when getting user id!");
                    printServerErrorMsg(xhr);
                    showErrorMsg();
                    if (typeof callback["error"] === "function") callback["error"](xhr);
                }
            });
        }

        // Get the json file that contains image links
        function getSegmentationBatch(callback) {
            callback = safeGet(callback, {});
            util.postJSON(api_url_root + "get_segment_batch", {
                user_token: user_token,
            }, {
                success: function (data) {
                    if (typeof callback["success"] === "function") callback["success"](data);
                },
                error: function (xhr) {
                    console.error("Error when getting video urls!");
                    printServerErrorMsg(xhr);
                    showErrorMsg();
                    if (xhr.status == 401) {
                        // This means that the user token is not valid
                        if (typeof callback["error"] === "function") callback["error"](xhr);
                    } else {
                        if (typeof callback["error"] === "function") callback["error"](xhr);
                    }
                }
            });
        }

        // Print error message returned by the server
        function printServerErrorMsg(xhr) {
            console.error("Server respond: " + JSON.stringify(xhr.responseJSON));
        }

        // Print warning message returned by the server
        function printServerWarnMsg(xhr) {
            console.warn("Server respond: " + JSON.stringify(xhr.responseJSON));
        }

        // TODO implement this function
        // Collect the data from the given Bbox
        function collectBoxData() {
            var $boxes = $(".bbox");
            var css_properties = [];
            for (let i = 0; i < $boxes.length; i++) {
              const $box = $boxes[i];
              const box_style = window.getComputedStyle($box);
        
              // Retrieve CSS properties
              var width = box_style.getPropertyValue('width');
              var height = box_style.getPropertyValue('height');
              var top = box_style.getPropertyValue('top');
              var left = box_style.getPropertyValue('left');
        
              console.log("Width: " + width);
        
              // Store the properties in an object
              css_properties.push({
                div_size: 0, // Size of the img div on the page 
                img_id: i,
                img_frame: 0,
                cropped_width: 0,
                cropped_height: 0,
                relative_boxes: { // True size of bbox will be calculated at the backend (segmentationFeedback_operations.py->true_size())
                  x: top,
                  y: left,
                  w: width,
                  h: height
                }
              });
            }
        
            // Export to JSON
            // TODO export the JSON file to the backend
            const json_file = JSON.stringify(css_properties)
            console.log(json_file);
          }

        // Set a batch of labeled segmentations back to the server
        function sendSegmentationBatch(callback, options) {
            callback = safeGet(callback, {});
            options = safeGet(options, {});
            var ignore_labels = safeGet(options["ignore_labels"], false);
            var labels = collectAndRemoveLabels();
            showLoadingMsg();
            // TODO collect the bounding box data using collectBoxData()
            if (labels.length == 0 || ignore_labels) {
                if (typeof callback["success"] === "function") callback["success"]();
            } else {
                util.postJSON(api_url_root + "send_segmentation_batch", {
                    video_token: video_token,
                    user_token: user_token,
                    data: labels
                }, {
                    success: function (data) {
                        if (typeof callback["success"] === "function") callback["success"](data);
                    },
                    error: function (xhr) {
                        console.error("Error when sending video labels to the server!");
                        printServerErrorMsg(xhr);
                        showErrorMsg();
                        if (xhr.status == 401) {
                            // This means that the video token or user token is not valid
                            if (typeof callback["error"] === "function") callback["error"](xhr);
                        } else {
                            if (typeof callback["error"] === "function") callback["error"](xhr);
                        }
                    }
                });
            }
        }

        // Collect labels from the user interface
        function collectAndRemoveLabels() {
            var labels = [];
            $tool_videos.find("a").each(function () {
                var $item = $(this);
                var video_id = $item.data("id");
                if (typeof video_id === "undefined") return;
                var is_selected = $item.hasClass("selected") ? 1 : 0;
                labels.push({
                    video_id: video_id,
                    label: is_selected
                });
                $item.removeData("id")
            });
            return labels;
        }

        // Create a segmentation label element
        // IMPORTANT: Safari on iPhone only allows displaying maximum 16 videos at once
        // UPDATE: starting from Safari 12, more videos are allowed
        function createSegmentation(i) {
            var $item = $("<a href='javascript:void(0)' class='flex-column video-container'></a>");
            var $caption = $("<div>" + (i + 1) + "</div>");
            // "autoplay" is needed for iPhone Safari to work
            // "preload" is ignored by mobile devices
            // "disableRemotePlayback" prevents chrome casting
            // "playsinline" and "playsInline" prevents playing video fullscreen
            var $vid = $("<video class='return-size' autoplay preload loop muted playsinline playsInline disableRemotePlayback></video>");
            // TODO Change it to img tag instead of video tag to propaly display the image
            var $img = $("<img class='return-size' src='../img/crop.png'>");
            $item.append($vid).append($caption);
            return $item;
        }

        // Update the videos with a new batch of urls
        function updateSegmentations(video_data, callback) {
            var deferreds = [];
            // Add videos
            for (var i = 0; i < video_data.length; i++) {
                var v = video_data[i];
                var $item;

                if (typeof video_items[i] === "undefined") {
                    $item = createSegmentation(i);
                    video_items.push($item);
                    $tool_videos.append($item);
                } else {
                    $item = video_items[i];
                    removeSelect($item);
                }
                $item.data("id", v["id"]);

                var $vid = $item.find("video");
                $vid.one("canplay", function () {
                    // Play the video
                    util.handleVideoPromise(this, "play");
                });
                if (!$vid.complete) {
                    var deferred = $.Deferred();
                    $vid.one("canplay", deferred.resolve);
                    $vid.one("error", deferred.reject);
                    deferreds.push(deferred);
                }
                var src_url = util.buildSegmentationURL(v);
                $vid.prop("src", src_url);
                util.handleVideoPromise($vid.get(0), "load"); // load to reset video promise
                if ($item.hasClass("force-hidden")) {
                    $item.removeClass("force-hidden");
                }
            }
            // Hide exceeding videos
            for (var i = video_data.length; i < video_items.length; i++) {
                var $item = video_items[i];
                if (!$item.hasClass("force-hidden")) {
                    $item.addClass("force-hidden");
                }
            }
            // Load and show videos
            callback = safeGet(callback, {});
            util.resolvePromises(deferreds, {
                success: function (data) {
                    updateTool($tool_videos);


                    if (typeof callback["success"] === "function") callback["success"](data);
                },
                error: function (xhr) {
                    console.warn("Some img urls are broken.");
                    printServerWarnMsg(xhr);
                    showBadSegmentMsg();
                    if (typeof callback["abort"] === "function") callback["abort"](xhr);
                }
            });
        }

        // Create resizers for the boundary box
        // Touch is used for phone
        // Mouse is used for desktop
        function createResizer($box, div_size) {
            const $leftBox = $('<div class="resizer top-left"></div>');
            const $rightBox = $('<div class="resizer bottom-right"></div>');

            const BORDER_SIZE = 20;

            let start_width, start_height;
            let start_x, start_y;
            let start_top, start_left;

            function handlerRightMovement(e) {
                // Calculates the new width and height of the box based on the movement
                const client_x = e.clientX || e.touches[0].clientX;
                const client_y = e.clientY || e.touches[0].clientY;

                // Determine the new dimensions based on the initial state
                const new_width = start_width + (client_x - start_x);
                const new_height = start_height + (client_y - start_y);

                // Update the width and height of the box without exceeding the image size
                $box[0].style.width =  Math.min(new_width, div_size - start_left) + 'px';
                $box[0].style.height = Math.min(new_height, div_size - start_top) + 'px';
            }

            function handlerLeftMovement(e) {
                // Calculates the new width and height of the box based on the movement
                const client_x = e.clientX || e.touches[0].clientX;
                const client_y = e.clientY || e.touches[0].clientY;
            
                // Determine the new dimensions based on the initial state
                const new_width = start_width - (client_x - start_x);
                const new_height = start_height - (client_y - start_y);
                const new_left = start_left + (client_x - start_x);
                const new_top = start_top + (client_y - start_y);
            
                // Update the width and height of the box without exceeding the image size
                $box[0].style.width =  Math.min(new_width, div_size - start_left) + 'px';
                $box[0].style.height = Math.min(new_height, div_size - start_top) + 'px';
                $box[0].style.left = Math.max(new_left, BORDER_SIZE) + 'px';
                $box[0].style.top = Math.max(new_top, BORDER_SIZE) + 'px';
            }
            // Listeners are added when the user interacts with the bbox
            function addListener(handler) {
                document.addEventListener('mousemove', handler);
                document.addEventListener('mouseup', removeListener);

                document.addEventListener('touchmove', handler);
                document.addEventListener('touchend', removeListener);
            }

            function removeListener() {
                document.removeEventListener('mousemove', handlerRightMovement);
                document.removeEventListener('touchmove', handlerRightMovement);

                document.removeEventListener('mousemove', handlerLeftMovement);
                document.removeEventListener('touchmove', handlerLeftMovement);

                document.removeEventListener('mouseup', removeListener);
                document.removeEventListener('touchend', removeListener);
            }            

           // Initializes the resizing process
            function startResizing(e, handler) {
                e.preventDefault();
                start_x = e.clientX || e.touches[0].clientX;
                start_y = e.clientY || e.touches[0].clientY;
                start_width = $box[0].offsetWidth;
                start_height = $box[0].offsetHeight;
                start_left = $box[0].offsetLeft;
                start_top = $box[0].offsetTop;

                addListener(handler);
            }

            // Attach the event listeners
            $rightBox[0].addEventListener('mousedown', (e) => startResizing(e, handlerRightMovement));
            $rightBox[0].addEventListener('touchstart', (e) => startResizing(e, handlerRightMovement));

            $leftBox[0].addEventListener('mousedown', (e) => startResizing(e, handlerLeftMovement));
            $leftBox[0].addEventListener('touchstart', (e) => startResizing(e, handlerLeftMovement));

            return [$rightBox, $leftBox];
        }

        // Calculate the bounding box based on the given meta data
        function calculateBBox(meta_data, div_size) {
            const img_width = meta_data["w_image"];
            const img_height = meta_data["h_image"];

            const x = meta_data["x_bbox"]
            const y = meta_data['y_bbox']
            const w = meta_data['w_bbox']
            const h = meta_data['h_bbox']

            const box_x = (x / img_width) * div_size
            const box_y = (y / img_height) * div_size
            const box_w = (w / img_width) * div_size
            const box_h = (h / img_height) * div_size

            return {
                left: box_x,
                top: box_y,
                width: box_w,
                height: box_h,
                image_width: img_width,
                image_height: img_height
            };
        }

        // Create a bounding box element
        function createBBox(meta_data, div_size = 420) {
            // The html page creates a padding of 10px on both sides
            // The coordinates will be adjusted based on the padding
            const DIV_SIZE_STARTING_VALUE = 20;

            const $box = $(`<div class="bbox"></div>`);
            const adjusted_data = calculateBBox(meta_data, div_size);
            // Update the bounding box style based on the bbox object
            $box.css({
                position: "absolute",
                display: "flex",
                left: DIV_SIZE_STARTING_VALUE + adjusted_data.left + 'px',
                top: DIV_SIZE_STARTING_VALUE + adjusted_data.top + 'px',
                width: adjusted_data.width + 'px',
                height: adjusted_data.height + 'px',
                border: "3px solid red"
            });

            const resize_boxes = createResizer($box, div_size)
            $box.append(resize_boxes[0])
            $box.append(resize_boxes[1])
            return $box;
        }

        // Update bounding box in the video
        function updateBbox(segment_data, selector) {
            let intervalID = setInterval(function () {
                const element = $(selector);
                if (element.length > 0) {
                    clearInterval(intervalID);
                    var border_width = parseInt(element.css('border-top-width'));
                    var element_width = element.width() + border_width * 2;
                    
                    const parent_element = element.parent();

                    for (var i = 0; i < segment_data.length; i++) {
                        var v = segment_data[i];
                        var $box = createBBox(v, element_width);
                        $(parent_element[i]).append($box);
                    }

                }
            }, 100);
        }

        function updateTool($new_content) {
            $tool_videos.detach(); // detatch prevents the click event from being removed
            $tool.empty().append($new_content);
        }

        // Show not supported message
        function showNotSupportedMsg() {
            updateTool($not_supported_text);
        }

        // Show error message
        function showErrorMsg() {
            updateTool($error_text);
        }

        // Show no data message
        function showNoDataMsg() {
            updateTool($no_data_text);
        }

        // Show bad video requests message
        function showBadSegmentMsg() {
            updateTool($bad_video_text);
        }

        // Show loading message
        function showLoadingMsg() {
            updateTool($loading_text);
        }

        function safeGet(v, default_val) {
            return util.safeGet(v, default_val);
        }

        // Read the payload in a JWT
        function getJwtPayload(jwt) {
            return JSON.parse(window.atob(jwt.split('.')[1]));
        }

        // When getting a batch of segmentations successfully, update segmentations
        function onGetSegmentatioBatchSuccess(data, callback) {
            if (typeof data === "undefined") {
                console.error("The server does not return any data.");
                showNoDataMsg();
                if (typeof callback["error"] === "function") callback["error"]();
            } else {
                updateSegmentations(data["data"], {
                    success: function () {
                        // Need to store the token and return it back to the server when finished
                        video_token = data["video_token"];
                        if (typeof callback["success"] === "function") callback["success"]();
                    },
                    error: function (xhr) {
                        if (typeof callback["error"] === "function") callback["error"](xhr);
                    },
                    abort: function (xhr) {
                        // Need to store the token and return it back to the server when finished
                        video_token = data["video_token"];
                        if (typeof callback["abort"] === "function") callback["abort"](xhr);
                    }
                });
                updateBbox(data["data"], ".return-size");
            }
        }

        // When sending the current batch of segmentation labels successfully, get a new batch of segmentations
        function onSendSegmentationBatchSuccess(data, callback) {
            // Update the user score
            if (typeof data !== "undefined") {
                user_score = data["data"]["score"]["user"];
                user_raw_score = data["data"]["score"]["raw"];
                if (typeof on_user_score_update === "function") on_user_score_update(user_score, user_raw_score, data["data"]["score"]["batch"]);
            }
            // Get a new batch
            getSegmentationBatch({
                success: function (data) {
                    onGetSegmentatioBatchSuccess(data, callback);
                },
                error: function (xhr) {
                    if (typeof callback["error"] === "function") callback["error"](xhr);
                },
                abort: function (xhr) {
                    if (typeof callback["abort"] === "function") callback["abort"](xhr);
                }
            });
        }

        // When the user ID is updated successfully
        function onUserIdUpdateSuccess(data) {
            user_token = data["user_token"];
            var user_payload = getJwtPayload(user_token);
            user_id = user_payload["user_id"];
            user_score = user_payload["user_score"];
            user_raw_score = user_payload["user_raw_score"];
            is_admin = user_payload["client_type"] == 0 ? true : false;
            if (typeof on_user_score_update === "function") on_user_score_update(user_score, user_raw_score);
        }

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////
        //
        // Public methods
        //
        this.next = function (callback, options) {
            callback = safeGet(callback, {});
            if (util.browserSupported()) {
                sendSegmentationBatch({
                    success: function (data) {
                        onSendSegmentationBatchSuccess(data, callback);
                    },
                    error: function (xhr) {
                        if (typeof callback["error"] === "function") callback["error"](xhr);
                    },
                    abort: function (xhr) {
                        onSendSegmentationBatchSuccess(xhr.responseJSON, callback);
                    }
                }, options);
            } else {
                showNotSupportedMsg();
                console.warn("Browser not supported.")
                if (typeof callback["error"] === "function") callback["error"]("Browser not supported.");
            }
        };

        this.userId = function () {
            return user_id;
        };

        this.updateUserIdByGoogleIdToken = function (google_id_token, callback) {
            callback = safeGet(callback, {});
            login({
                google_id_token: google_id_token
            }, {
                success: function (data) {
                    onUserIdUpdateSuccess(data);
                    if (typeof callback["success"] === "function") callback["success"](this_obj);
                },
                error: function (xhr) {
                    if (typeof callback["error"] === "function") callback["error"](xhr);
                }
            });
        };

        this.updateUserIdByClientId = function (new_client_id, callback) {
            callback = safeGet(callback, {});
            login({
                client_id: safeGet(new_client_id, util.getUniqueId())
            }, {
                success: function (data) {
                    onUserIdUpdateSuccess(data);
                    if (typeof callback["success"] === "function") callback["success"](this_obj);
                },
                error: function (xhr) {
                    if (typeof callback["error"] === "function") callback["error"](xhr);
                }
            });
        };

        this.userScore = function () {
            return user_score;
        };

        this.isAdmin = function () {
            return is_admin;
        };

        this.userToken = function () {
            return user_token;
        };

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////
        //
        // Constructor
        //
        init();
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Register to window
    //
    if (window.edaplotjs) {
        window.edaplotjs.BboxLabelingTool = BboxLabelingTool;
    } else {
        window.edaplotjs = {};
        window.edaplotjs.BboxLabelingTool = BboxLabelingTool;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Register to window
    //


})();