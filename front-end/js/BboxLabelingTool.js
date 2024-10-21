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
        var img_items = [];
        //var $bad_video_text = $('<span class="bad-video-text">Oops!<br>Some image links are broken.<br>Please refresh this page.</span>');
        var $bad_video_text = $('<span class="bad-video-text">Error!<br>Het ziet ernaar uit dat sommige afbeelding\'s niet werken.<br>Laat deze pagina opnieuw in alstublieft.</span>');
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
                    console.error("Error when getting segmentation batch data!");
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

        // Set a batch of labeled segmentations back to the server
        function sendSegmentationBatch(callback, options) {
            callback = safeGet(callback, {});
            options = safeGet(options, {});
            var ignore_labels = safeGet(options["ignore_labels"], false);
            var labels = collectLabels();
            showLoadingMsg();
            if (labels.length == 0 || ignore_labels) {
                if (typeof callback["success"] === "function") callback["success"]();
            } else {
                // Notice that although the segmentaions are images,
                // we still use the video token because it is inherited from the video labeling tool.
                // However, it should really be the JWT token with segmentation image masks.
                util.postJSON(api_url_root + "send_segmentation_batch", {
                    video_token: video_token,
                    user_token: user_token,
                    data: labels
                }, {
                    success: function (data) {
                        if (typeof callback["success"] === "function") callback["success"](data);
                    },
                    error: function (xhr) {
                        console.error("Error when sending segmentation labels to the server!");
                        printServerErrorMsg(xhr);
                        showErrorMsg();
                        if (xhr.status == 401) {
                            // This means that the segmentation token or user token is not valid
                            if (typeof callback["error"] === "function") callback["error"](xhr);
                        } else {
                            if (typeof callback["error"] === "function") callback["error"](xhr);
                        }
                    }
                });
            }
        }

        // Collect labels from the user interface
        function collectLabels() {
            var labels = [];
            var $bboxes = $(".bbox");
            for (let i = 0; i < $bboxes.length; i++) {
                const $bbox = $bboxes.eq(i);
                const meta_data = $bbox.data("metadata");
                if (typeof meta_data === "undefined") return;
                // Null means that the bounding box looks good
                var bbox_original = null;
                if ($bbox.css("visibility") == "visible") {
                    // This means there should be a bounding box
                    if ($bbox.data("interacted")) {
                        // This means the user edited the bounding box
                        bbox_original = util.reverseBBox($bbox);
                    }
                } else {
                    // This means the user said that there should be no bounding box
                    bbox_original = false;
                }
                labels.push({
                    id: meta_data["id"],
                    relative_boxes: bbox_original
                });
            }
            return labels;
        }

        // Create a segmentation label element
        function createSegmentation(i) {
            var $item = $("<a href='javascript:void(0)' class='flex-column segmentation-container'></a>");
            var $caption = $("<div class='control-group'><span>Beeld " + (i + 1) + "</span><button class='box-toggle custom-button-flat'>Verwijder kader</button></div>");
            // Add the event for users to remove and add the bounding box.
            // Users can indicate if the image has or does not have smoke.
            // Notice that we cannot use the "hide" or "show" function because it will break when users resize the browser window.
            $caption.on("click", function () {
                var $this = $(this);
                var $bbox = $item.find(".bbox");
                if ($bbox.css("visibility") == "visible") {
                    $bbox.css("visibility", "hidden");
                    $this.find("button").text("Plaats kader");
                } else {
                    $bbox.css("visibility", "visible");
                    $this.find("button").text("Verwijder kader");
                }
            });
            var $img = $("<img class='seg-img' src=''>");
            $item.append($img).append($caption);
            return $item;
        }

        // Update the images with a new batch of urls
        function updateSegmentations(img_data, callback) {
            var deferreds = [];
            // Add images
            for (var i = 0; i < img_data.length; i++) {
                var v = img_data[i];
                var $item;
                if (typeof img_items[i] === "undefined") {
                    $item = createSegmentation(i);
                    img_items.push($item);
                    $tool_videos.append($item);
                } else {
                    $item = img_items[i];
                    $item.find(".box-toggle").text("Verwijder kader");
                }
                $item.data("id", v["id"]);
                var $img = $item.find("img").first();

                // Need to wait untill all images are loaded
                var deferred = $.Deferred();
                $img.one("load", deferred.resolve);
                $img.one("error", deferred.reject);
                deferreds.push(deferred);

                var src_url = util.buildSegmentationURL(v);
                $img.prop("src", src_url);
                if ($item.hasClass("force-hidden")) {
                    $item.removeClass("force-hidden");
                }
            }
            // Hide exceeding images
            for (var i = img_data.length; i < img_items.length; i++) {
                var $item = img_items[i];
                if (!$item.hasClass("force-hidden")) {
                    $item.addClass("force-hidden");
                }
            }
            // Load and show images
            callback = safeGet(callback, {});
            util.resolvePromises(deferreds, {
                success: function (data) {
                    updateTool($tool_videos);
                    if (typeof callback["success"] === "function") callback["success"](data);
                },
                error: function (xhr) {
                    console.warn("Some image urls are broken.");
                    printServerWarnMsg(xhr);
                    showBadSegmentMsg();
                    if (typeof callback["abort"] === "function") callback["abort"](xhr);
                }
            });
        }

        function updateBBox(segment_data, selector) {
            let intervalID = setInterval(function () {
                const $element = $(selector);
                if ($element.length > 0) {
                    clearInterval(intervalID);
                    const parent_element = $element.parent();
                    // Remove existing bounding box
                    parent_element.find(".bbox").remove();
                    for (var i = 0; i < segment_data.length; i++) {
                        var v = segment_data[i];
                        var $bbox = util.createBBox(v, $($element.get(i)), true);
                        $(parent_element[i]).append($bbox);
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

        // Show bad requests message
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
                        updateBBox(data["data"], ".seg-img");
                        if (typeof callback["success"] === "function") callback["success"]();
                    },
                    error: function (xhr) {
                        if (typeof callback["error"] === "function") callback["error"](xhr);
                    },
                    abort: function (xhr) {
                        // Need to store the token and return it back to the server when finished
                        video_token = data["video_token"];
                        updateBBox(data["data"], ".seg-img");
                        if (typeof callback["abort"] === "function") callback["abort"](xhr);
                    }
                });
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
