(function () {
    "use strict";

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Create the class
    //
    var VideoLabelingTool = function (container_selector, settings) {
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
        var $bad_video_text = $('<span class="bad-video-text">Oops!<br>Some video links are broken.<br>Please refresh this page.</span>');
        var $error_text = $('<span class="error-text">Oops!<br>Server may be down or busy.<br>Please come back later.</span>');
        var $no_data_text = $('<span class="no-data-text">Thank you!<br>Videos are all labeled.<br>Please come back later.</span>');
        var $loading_text = $('<span class="loading-text"></span>');
        var $not_supported_text = $('<span class="not-supported-text">We are sorry!<br>Your browser is not supported.</span>');
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

        const JSON_temp = {
            "boxes": {
                "x": 366,
                "y": 96,
                "w": 75,
                "h": 123
            },
            "relative_boxes": {
                "x": 219,
                "y": 96,
                "w": 75,
                "h": 123
            },
            "image_width": 900,
            "image_height": 900,
            "cropped_width": 512,
            "cropped_height": 512
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
        function getVideoBatch(callback) {
            callback = safeGet(callback, {});
            util.postJSON(api_url_root + "get_batch", {
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

        // Set a batch of labeled video clips back to the server
        function sendVideoBatch(callback, options) {
            callback = safeGet(callback, {});
            options = safeGet(options, {});
            var ignore_labels = safeGet(options["ignore_labels"], false);
            var labels = collectAndRemoveLabels();
            showLoadingMsg();
            if (labels.length == 0 || ignore_labels) {
                if (typeof callback["success"] === "function") callback["success"]();
            } else {
                util.postJSON(api_url_root + "send_batch", {
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

        // Create a video label element
        // IMPORTANT: Safari on iPhone only allows displaying maximum 16 videos at once
        // UPDATE: starting from Safari 12, more videos are allowed
        function createVideo(i) {
            var $item = $("<a href='javascript:void(0)' class='flex-column video-container'></a>");
            var $caption = $("<div>" + (i + 1) + "</div>");
            // "autoplay" is needed for iPhone Safari to work
            // "preload" is ignored by mobile devices
            // "disableRemotePlayback" prevents chrome casting
            // "playsinline" and "playsInline" prevents playing video fullscreen
            var $vid = $("<video class='return-size' autoplay preload loop muted playsinline playsInline disableRemotePlayback></video>");
            var $img = $("<img class='return-size' src='../img/crop.png'>");
            $item.append($vid).append($caption);
            return $item;
        }

        // Update the videos with a new batch of urls
        function updateVideos(video_data, callback) {
            var deferreds = [];
            // Add videos
            for (var i = 0; i < video_data.length; i++) {
                var v = video_data[i];
                var $item;

                if (typeof video_items[i] === "undefined") {
                    $item = createVideo(i);
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
                var src_url = util.buildVideoURL(v);
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
                    console.warn("Some video urls are broken.");
                    printServerWarnMsg(xhr);
                    showBadVideoMsg();
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

                // Determine the new dimensions based on the initial state'
                const new_width = start_width + client_x - start_x;
                const new_height = start_height + client_y - start_y;

                // Update the width and height of the box without exceeding the image size
                $box[0].style.width =  Math.min(new_width, div_size - start_left) + 'px';
                $box[0].style.height = Math.min(new_height, div_size - start_top) + 'px';
            }

            function handlerLeftMovement(e) {
                // Calculates the new position and size of the box based on the movement
                const client_x = e.clientX || e.touches[0].clientX;
                const client_y = e.clientY || e.touches[0].clientY;
            
                // Determine the deltas based on the initial state
                const deltaX = client_x - start_x;
                const deltaY = client_y - start_y;
            
                // New dimensions and positions
                const new_width = start_width - deltaX;
                const new_height = start_height - deltaY;
                const new_left = start_left + deltaX;
                const new_top = start_top + deltaY;
            
                // Ensure new dimensions and positions do not exceed the container's boundaries
                $box[0].style.width =  Math.min(new_width, div_size - start_left) + 'px';
                $box[0].style.height = Math.min(new_height, div_size - start_top) + 'px';
                $box[0].style.left = Math.max(new_left, 0); + 'px';
                $box[0].style.top = Math.max(new_top, 0); + 'px';
            }

            // function handlerLeftMovement(e) {
            //     // Calculates the new width and height of the box based on the movement
            //     const clientX = e.clientX || e.touches[0].clientX;
            //     const clientY = e.clientY || e.touches[0].clientY;
            //     // Make it so that the box can be expended to the left
            //     const deltaX = clientX - start_x;
            //     const deltaY = clientY - start_y;
            //     // Determine the new dimensions based on the initial state
            //     $box[0].style.width = (start_width - deltaX) + 'px';
            //     $box[0].style.height = (start_height - deltaY) + 'px';
            //     $box[0].style.left = (start_left + deltaX) + 'px';
            //     $box[0].style.top = (start_top + deltaY) + 'px';
            // }

            function removeListener() {
                document.removeEventListener('mousemove', handlerRightMovement);
                document.removeEventListener('touchmove', handlerRightMovement);

                document.removeEventListener('mousemove', handlerLeftMovement);
                document.removeEventListener('touchmove', handlerLeftMovement);

                document.removeEventListener('mouseup', removeListener);
                document.removeEventListener('touchend', removeListener);
            }

            function addListener(handler) {
                document.addEventListener('mousemove', handler);
                document.addEventListener('touchmove', handler);
                document.addEventListener('mouseup', removeListener);
                document.addEventListener('touchend', removeListener);
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

        // Create a bounding box element
        function createBBox(bbox, div_size = 420) {
            const STARTING_VALUE = 20;

            const $box = $(`<div class="bbox"></div>`);
            // Update the bounding box style based on the bbox object
            $box.css({
                position: "absolute",
                display: "flex",
                left: STARTING_VALUE + bbox.left + 'px',
                top: STARTING_VALUE + bbox.top + 'px',
                width: bbox.width + 'px',
                height: bbox.height + 'px',
                border: "3px solid red"
            });

            const resize_boxes = createResizer($box, div_size)
            $box.append(resize_boxes[0])
            $box.append(resize_boxes[1])
            return $box;
        }

        // Calculate the bounding box based on the given meta data
        function calculateBBox(meta_data, div_size = 420) {
            const relative_boxes = meta_data["relative_boxes"];
            const cropped_width = meta_data["cropped_width"];
            const cropped_height = meta_data["cropped_height"];

            const x = relative_boxes['x']
            const y = relative_boxes['y']
            const w = relative_boxes['w']
            const h = relative_boxes['h']

            const box_x = (x / cropped_width) * div_size
            const box_y = (y / cropped_height) * div_size
            const box_w = (w / cropped_width) * div_size
            const box_h = (h / cropped_height) * div_size

            return {
                left: Math.round(box_x),
                top: Math.round(box_y),
                width: Math.round(box_w),
                height: Math.round(box_h),
                image_width: cropped_width,
                image_height: cropped_height
            };
        }

        // Update bounding box in the video
        function updateBbox(video_data, selector) {
            let intervalID = setInterval(function () {
                const element = $(selector);
                if (element.length > 0) {
                    clearInterval(intervalID);
                    var border_width = parseInt(element.css('border-top-width'));
                    var element_width = element.width() + border_width * 2;

                    console.log('Element width: ', element_width);
                    const parent_element = element.parent();

                    for (var i = 0; i < video_data.length; i++) {
                        var v = video_data[i];
                        v['bbox'] = calculateBBox(JSON_temp, element_width);
                        var $box = createBBox(v['bbox']);
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
        function showBadVideoMsg() {
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

        // When getting a batch of videos successfully, update videos
        function onGetVideoBatchSuccess(data, callback) {
            if (typeof data === "undefined") {
                console.error("The server does not return any data.");
                showNoDataMsg();
                if (typeof callback["error"] === "function") callback["error"]();
            } else {
                updateVideos(data["data"], {
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

        // When sending the current batch of video labels successfully, get a new batch of videos
        function onSendVideoBatchSuccess(data, callback) {
            // Update the user score
            if (typeof data !== "undefined") {
                user_score = data["data"]["score"]["user"];
                user_raw_score = data["data"]["score"]["raw"];
                if (typeof on_user_score_update === "function") on_user_score_update(user_score, user_raw_score, data["data"]["score"]["batch"]);
            }
            // Get a new batch
            getVideoBatch({
                success: function (data) {
                    onGetVideoBatchSuccess(data, callback);
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
                sendVideoBatch({
                    success: function (data) {
                        onSendVideoBatchSuccess(data, callback);
                    },
                    error: function (xhr) {
                        if (typeof callback["error"] === "function") callback["error"](xhr);
                    },
                    abort: function (xhr) {
                        onSendVideoBatchSuccess(xhr.responseJSON, callback);
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
        window.edaplotjs.VideoLabelingTool = VideoLabelingTool;
    } else {
        window.edaplotjs = {};
        window.edaplotjs.VideoLabelingTool = VideoLabelingTool;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Register to window
    //


})();