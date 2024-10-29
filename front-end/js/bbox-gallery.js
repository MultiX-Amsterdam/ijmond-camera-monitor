(function () {
  "use strict";

  var util = new edaplotjs.Util();
  var widgets = new edaplotjs.Widgets();
  var google_account_dialog;
  var api_url_root = util.getRootApiUrl();
  var api_url_path_get = "get_pos_labels_seg";
  var $gallery_no_data_text = $('<span class="gallery-no-data-text">No images are found.</span>');
  var $gallery_error_text = $('<span class="gallery-error-text">Oops!<br>Server may be down or busy.<br>Please come back later.</span>');
  var $gallery_loading_text = $('<span class="gallery-loading-text"></span>');
  var $gallery_not_supported_text = $('<span class="gallery-not-supported-text">We are sorry!<br>Your browser is not supported.</span>');
  var $gallery;
  var $gallery_images;
  var image_items = [];
  var $page_nav;
  var $page_back;
  var $page_next;
  var $page_control;
  var user_id;
  var is_admin = false; // including expert and researcher
  var is_researcher = false;
  var user_token;
  var user_token_for_other_app;
  var $set_label_confirm_dialog;

  function updateGallery($new_content) {
    $gallery_images.detach(); // detatch prevents the click event from being removed
    $gallery.empty().append($new_content);
  }

  function showNoGalleryMsg() {
    updateGallery($gallery_no_data_text);
  }

  function showGalleryErrorMsg() {
    updateGallery($gallery_error_text);
  }

  function showGalleryLoadingMsg() {
    updateGallery($gallery_loading_text);
  }

  function showGalleryNotSupportedMsg() {
    updateGallery($gallery_not_supported_text);
  }

  function createImage() {
    var $item = $("<a href='javascript:void(0)' class='flex-column segmentation-container'></a>");
    var $img = $("<img class='seg-img' src=''>");
    $item.append($img);
    var $control = $("<div class='label-control'></div>");
    // Add the date and time information
    var $dt = $("<p class='text-small-margin'><i></i></p>");
    $control.append($dt)
    if (typeof user_id === "undefined") {
      if (is_admin) {
        var $seg_id = $("<p class='text-small-margin'><i></i></p>");
        $control.append($seg_id);
        var $link_to_video = $("<p class='text-small-margin'><i></i></p>");
        $control.append($link_to_video);
        if (is_researcher) {
          var $label_control = $('<div class="control-group"></div>');
          var $edit_btn = $('<button class="custom-button-flat stretch-on-mobile">Edit box</button>');
          $label_control.append($edit_btn);
          var $toggle_btn = $('<button class="custom-button-flat stretch-on-mobile">Toggle box</button>');
          $toggle_btn.hide();
          $label_control.append($toggle_btn);
          $control.append($label_control);
          $edit_btn.on("click", function () {
            var $this = $(this);
            var $seg_container = $this.parent().parent().parent();
            var $researcher_resizer = $seg_container.find(".bbox.researcher .resizer");
            if ($researcher_resizer.length == 0) {
              // This means there is no researcher label, so we need to create a bounding box.
              var $img = $seg_container.find("img.seg-img");
              var feedback_code = 3; // this means that the model output looks good
              var $bbox = util.createBBox($this.data("seg_mask"), $img, false, feedback_code);
              $seg_container.append($bbox);
            }
            if ($this.hasClass("edit-mode")) {
              $set_label_confirm_dialog.data("edit_btn", $this);
              $set_label_confirm_dialog.data("toggle_btn", $toggle_btn);
              $set_label_confirm_dialog.dialog("open");
            } else {
              $this.addClass("edit-mode");
              $this.text("Confirm editing");
              $researcher_resizer.show();
              $toggle_btn.show();
            }
          });
          $toggle_btn.on("click", function () {
            var $this = $(this);
            var $seg_container = $this.parent().parent().parent();
            var $bbox_researcher = $seg_container.find(".bbox.researcher");
            if ($bbox_researcher.css("visibility") == "visible") {
              $bbox_researcher.css("visibility", "hidden");
            } else {
              $bbox_researcher.css("visibility", "visible");
            }
          });
        }
      }
    }
    $item.append($control);
    return $item;
  }

  function safeGet(v, default_val) {
    return util.safeGet(v, default_val);
  }

  function updateItem($item, seg_mask) {
    // Update date and time information
    var src_url = util.buildSegmentationURL(seg_mask);
    var $i = $item.children(".label-control").find("i").removeClass();
    var date_str = (new Date(parseInt(seg_mask["frame_timestamp"]) * 1000)).toLocaleString("nl-NL", {
      timeZone: "Europe/Amsterdam",
      day: 'numeric', // Day of the month (e.g., 25)
      month: 'long', // Full month name (e.g., juni)
      year: 'numeric', // Full year (e.g., 2024)
      hour: '2-digit', // Hour (e.g., 15)
      minute: '2-digit', // Minutes (e.g., 45)
      hour12: false
    });
    seg_mask["video"]["url_root"] = seg_mask["url_root"];
    $($i.get(0)).html("<a target='_blank' href='" + util.segmentationFeedbackToVideoPanoramaURL(seg_mask) + "'>" + date_str + "</a>");
    if (typeof user_id === "undefined") {
      if (is_admin) {
        $($i.get(1)).text("ID: " + seg_mask["id"]).addClass("custom-text-info-dark-theme");
        $($i.get(2)).html("<a target='_blank' href='" + util.buildVideoURL(seg_mask["video"]) + "'>Link to Video</a>");
        // Save data to DOM
        $item.find("button").data("seg_mask", seg_mask);
      }
    }
    var $img = $item.find("img");
    $img.prop("src", src_url);

    // Overlay the boxes untill the image is loaded
    var deferred = $.Deferred();
    $img.one("load", deferred.resolve);
    $img.one("error", deferred.reject);
    var deferreds = [deferred];
    util.resolvePromises(deferreds, {
      success: function () {
        resetAndOverlayAllBBox($item, seg_mask);
      }
    });

    return $item;
  }

  function resetAndOverlayAllBBox($item, seg_mask) {
    $item.find(".bbox").remove();
    var bbox_list = seg_mask["feedback_filtered"];
    for (var i = 0; i < bbox_list.length; i++) {
      var is_orignal_box_null = false;
      var b = bbox_list[i];
      if (b["x_bbox"] == -1 && b["y_bbox"] == -1 && b["w_bbox"] == -1 && b["h_bbox"] == -1) {
        continue;
      }
      var meta_data = {
        w_image: seg_mask["w_image"],
        h_image: seg_mask["h_image"]
      };
      if (b["x_bbox"] == null && b["y_bbox"] == null && b["w_bbox"] == null && b["h_bbox"] == null) {
        is_orignal_box_null = true;
        meta_data["x_bbox"] = seg_mask["x_bbox"];
        meta_data["y_bbox"] = seg_mask["y_bbox"];
        meta_data["w_bbox"] = seg_mask["w_bbox"];
        meta_data["h_bbox"] = seg_mask["h_bbox"];
      } else {
        meta_data["x_bbox"] = b["x_bbox"];
        meta_data["y_bbox"] = b["y_bbox"];
        meta_data["w_bbox"] = b["w_bbox"];
        meta_data["h_bbox"] = b["h_bbox"];
      }
      var $bbox = util.createBBox(meta_data, $item.find(".seg-img"), true, b["feedback_code"]);
      // The is_orignal_box_null flag is used when we need to return the edited box the the back-end
      $bbox.data("is_orignal_box_null", is_orignal_box_null);
      $item.append($bbox);
    }
  }

  function updateImages(meta_data) {
    // Add DOM elements
    for (var i = 0; i < meta_data.length; i++) {
      var seg_mask = meta_data[i];
      var $item;
      if (typeof image_items[i] === "undefined") {
        $item = createImage();
        image_items.push($item);
        $gallery_images.append($item);
      } else {
        $item = image_items[i];
      }
      $item = updateItem($item, seg_mask);
      if ($item.hasClass("force-hidden")) {
        $item.removeClass("force-hidden");
      }
    }
    // Hide exceeding DOM elements
    for (var i = meta_data.length; i < image_items.length; i++) {
      var $item = image_items[i];
      if (!$item.hasClass("force-hidden")) {
        $item.addClass("force-hidden");
      }
    }
  }

  function initPagination() {
    $page_nav = $("#page-navigator");
    $page_control = $("#page-control");
    $page_nav.pagination({
      dataSource: api_url_root + api_url_path_get,
      locator: "data",
      totalNumberLocator: function (response) {
        if (typeof response === "undefined") {
          showNoGalleryMsg();
        } else {
          return parseInt(response["total"]);
        }
      },
      formatAjaxError: function () {
        showGalleryErrorMsg();
      },
      ajax: {
        type: "POST",
        data: {
          user_token: user_token
        }
      },
      className: "paginationjs-custom",
      pageSize: 16,
      showPageNumbers: false,
      showNavigator: true,
      showGoInput: true,
      showGoButton: true,
      showPrevious: false,
      showNext: false,
      goButtonText: "Gaan",
      callback: function (data, pagination) {
        if (typeof data !== "undefined" && data.length > 0) {
          $(window).scrollTop(0);
          updateGallery($gallery_images);
          updateImages(data);
        } else {
          $(window).scrollTop(0);
          showNoGalleryMsg();
        }
        // Handle UI
        var total_page = $page_nav.pagination("getTotalPage");
        if (typeof total_page !== "undefined" && !isNaN(total_page) && total_page != 1) {
          if ($page_control.hasClass("force-hidden")) {
            $page_control.removeClass("force-hidden");
          }
          var page_num = pagination["pageNumber"];
          if (page_num == 1) {
            $page_back.prop("disabled", true);
          } else {
            $page_back.prop("disabled", false);
          }
          if (page_num == total_page) {
            $page_next.prop("disabled", true);
          } else {
            $page_next.prop("disabled", false);
          }
        } else {
          if (!$page_control.hasClass("force-hidden")) {
            $page_control.addClass("force-hidden");
          }
        }
      }
    });
    $page_back = $("#page-back");
    $page_back.on("click", function () {
      showGalleryLoadingMsg();
      $page_nav.pagination("previous");
    });
    $page_next = $("#page-next");
    $page_next.on("click", function () {
      showGalleryLoadingMsg();
      $page_nav.pagination("next");
    });
  }

  function initConfirmDialog() {
    $set_label_confirm_dialog = widgets.createCustomDialog({
      selector: "#set-label-confirm-dialog",
      action_text: "Yes",
      action_callback: function () {
        var $edit_btn = $set_label_confirm_dialog.data("edit_btn");
        var $toggle_btn = $set_label_confirm_dialog.data("toggle_btn");
        var $seg_container = $edit_btn.parent().parent().parent();
        var $bbox = $seg_container.find(".bbox.researcher");
        var seg_mask = $edit_btn.data("seg_mask");
        var bbox_original = null; // null means that the model's output looks good
        if ($bbox.css("visibility") == "visible") {
          // This means there should be a bounding box
          if ($bbox.data("interacted")) {
            // This means the user edited the bounding box
            bbox_original = util.reverseBBox($bbox);
          } else {
            // The reason of using safeGet() here is because if the box is created by pressing the edit button,
            // The value of is_orignal_box_null would be undefined.
            // So the default value should be true,
            // because when the box is created, initially it fits the AI model's output,
            // which means that the box should be null when returning the feedback to the back-end.
            if (!safeGet($bbox.data("is_orignal_box_null"), true)) {
              // Although the use did not edit the bounding box,
              // it is still possible that the box was orignally null,
              // which means that the model output is good enough and does not require editing.
              // But if the original box is not null,
              // This means that the box was edited before,
              // So we need to respect this by returning the box.
              bbox_original = util.reverseBBox($bbox);
            }
          }
        } else {
          // This means the user said that there should be no bounding box
          bbox_original = false;
        }
        const is_gold_standard = $("#gold-standard-toggle").is(":checked");
        var labels = [{
          id: seg_mask["id"],
          relative_boxes: bbox_original,
          is_gold_standard: is_gold_standard
        }];
        setLabelState(labels, {
          success: function () {
            console.log("Set label state successfully");
            console.log(labels);
            // Get out of the edit mode
            $edit_btn.removeClass("edit-mode");
            $edit_btn.text("Edit box");
            $toggle_btn.hide();
            var $researcher_resizer = $seg_container.find(".bbox.researcher .resizer");
            $researcher_resizer.hide();
            $set_label_confirm_dialog.removeData("edit_btn");
          },
          error: function () {
            console.log("Error when setting label state");
            console.log(labels);
          }
        });
      },
      cancel_text: "No, do nothing",
      no_body_scroll: true,
      show_close_button: false,
      full_width_button: true
    });
  }

  function setLabelState(labels, callback) {
    callback = safeGet(callback, {});
    $.ajax({
      url: api_url_root + "set_segmentation_label_state",
      type: "POST",
      data: JSON.stringify({
        "data": labels,
        "user_token": user_token
      }),
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
  }

  function initDownloadButton() {
    $("#download-data").on("click", function () {
      var $this = $(this);
      $this.prop("disabled", true);
      $.ajax({
        url: api_url_root + "get_all_labels_seg",
        type: "POST",
        data: {
          user_token: user_token
        },
        contentType: "application/x-www-form-urlencoded; charset=UTF-8",
        dataType: "json",
        success: function (data) {
          // Download data
          util.downloadJSON(data, "segmentation_labels.json");
          // Reset button
          $this.prop("disabled", false);
        },
        error: function (xhr) {
          console.error("Error when getting segmentation json!", xhr);
        }
      });
    });
    $("#download-user-token").on("click", function () {
      var $this = $(this);
      $this.prop("disabled", true);
      // Download data
      util.downloadJSON({
        user_token: user_token_for_other_app
      }, "user_token.json");
      // Reset button
      $this.prop("disabled", false);
    });
  }

  function onLoginSuccess(data) {
    user_token = data["user_token"];
    user_token_for_other_app = data["user_token_for_other_app"];
    var payload = util.getJwtPayload(user_token);
    var client_type = payload["client_type"];
    var desired_href_review = "bbox-gallery.html" + "?user_id=" + payload["user_id"];
    $("#review-community").prop("href", desired_href_review);
    $("#review-admin").prop("href", desired_href_review);
    is_admin = (client_type == 0 || client_type == 1) ? true : false;
    is_researcher = client_type == 0 ? true : false;
    if (is_admin) {
      $(".admin-text").show();
      $(".admin-control").css("display", "flex");
    } else {
      $(".community-control").css("display", "flex");
    }
  }

  function onLoginComplete() {
    initPagination();
  }

  function setImageTypeText(method) {
    var $s = $("#image-type-text");
    if (method == "get_pos_labels_seg") {
      var html = "";
      html += "alle volledig gecontroleerd kaders met rook (";
      html += "<span class='custom-text-primary-dark-theme'>groene kaders worden gecreëerd door het AI-model; </span>";
      html += "<span class='custom-text-info2-dark-theme'>oranje kaders worden door burgers verstrekt; </span>";
      html += "<span class='custom-text-info-dark-theme'>cyaan kaders worden door onderzoekers verstrekt</span>";
      html += ")";
      $s.html(html);
      //$s.text("fully checked boxes with smoke");
    } else if (method == "get_neg_labels_seg") {
      $s.html("<span class='custom-text-info-dark-theme'>alle volledig gecontroleerd kaders zonder rook</span>");
      //$s.text("fully checked boxes with no smoke");
    } else if (method == "get_pos_labels_seg_by_researcher") {
      $s.html("<span class='custom-text-info-dark-theme'>alle volledig gecontroleerd kaders met rook door onderzoekers</span>");
      //$s.text("researcher-checked boxes with smoke");
    } else if (method == "get_neg_labels_seg_by_researcher") {
      $s.html("<span class='custom-text-info-dark-theme'>alle volledig gecontroleerd kaders zonder rook door onderzoekers</span>");
      //$s.text("researcher-checked boxes with no smoke");
    } else if (method == "get_pos_labels_seg_by_citizen") {
      $s.html("<span class='custom-text-info-dark-theme'>alle volledig gecontroleerd kaders met rook door burgers</span>");
      //$s.text("citizen-checked boxes with smoke");
    } else if (method == "get_neg_labels_seg_by_citizen") {
      $s.html("<span class='custom-text-info-dark-theme'>alle volledig gecontroleerd kaders zonder rook door burgers</span>");
      //$s.text("citizen-checked boxes with no smoke");
    } else if (method == "get_pos_gold_labels_seg") {
      $s.html("<span class='custom-text-info-dark-theme'>'gold standard' kaders met rook</span>");
      //$s.text("researcher-checked gold standards with smoke");
    } else if (method == "get_neg_gold_labels_seg") {
      $s.html("<span class='custom-text-info-dark-theme'>'gold standard' kaders zonder rook</span>");
      //$s.text("researcher-checked gold standards with no smoke");
    } else if (method == "get_discorded_labels_seg") {
      $s.html("<span class='custom-text-info-dark-theme'>kaders met onenigheid</span>");
      //$s.text("citizen-checked boxes with discord");
    } else if (method == "get_bad_labels_seg") {
      $s.html("<span class='custom-text-info-dark-theme'>slechte data</span>");
      //$s.text("boxes with bad labels");
    } else if (method == "get_maybe_pos_labels_seg") {
      $s.html("<span class='custom-text-info-dark-theme'>gecontroleerd kaders die mogelijk rook bevatten</span>");
      //$s.text("citizen-checked boxes that may have smoke");
    } else if (method == "get_maybe_neg_labels_seg") {
      $s.html("<span class='custom-text-info-dark-theme'>gecontroleerd kaders die mogelijk geen rook bevatten</span>");
      //$s.text("citizen-checked boxes that may not have smoke");
    }
  }

  function init() {
    $gallery = $(".gallery");
    $gallery_images = $(".gallery-images");
    var query_paras = util.getQueryParas();
    user_id = query_paras["user_id"];
    var method = query_paras["method"];
    if (typeof method !== "undefined") {
      api_url_path_get = method;
    }
    setImageTypeText(method);
    if (typeof user_id !== "undefined") {
      api_url_path_get += "?user_id=" + user_id;
      $(".user-text").show();
    } else {
      $(".intro-text").show();
    }
    initDownloadButton();
    google_account_dialog = new edaplotjs.GoogleAccountDialog();
    initConfirmDialog();
    if (util.browserSupported()) {
      showGalleryLoadingMsg();
      var ga_tracker = new edaplotjs.GoogleAnalyticsTracker({
        consent: util.checkUserConsent(),
        ready: function (ga_obj) {
          google_account_dialog.isAuthenticatedWithGoogle({
            success: function (is_signed_in, google_id_token) {
              if (is_signed_in) {
                $("#review-community").show();
                util.login({
                  google_id_token: google_id_token
                }, {
                  success: onLoginSuccess,
                  complete: onLoginComplete
                });
              } else {
                $("#review-community").hide();
                util.login({
                  client_id: ga_obj.getClientId()
                }, {
                  success: onLoginSuccess,
                  complete: onLoginComplete
                });
              }
            },
            error: function (error) {
              console.error("Error with Google sign-in: ", error);
              $("#review-community").hide();
              util.login({
                client_id: ga_obj.getClientId()
              }, {
                success: onLoginSuccess,
                complete: onLoginComplete
              });
            }
          });
        }
      });
    } else {
      console.warn("Browser not supported.");
      showGalleryNotSupportedMsg();
    }
  }

  $(init);
})();