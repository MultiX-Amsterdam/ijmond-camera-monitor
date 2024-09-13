(function () {
  "use strict";

  var util = new edaplotjs.Util();
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
  var user_token;

  function unpackVars(str) {
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

  // Get the parameters from the query string
  function getQueryParas() {
    return unpackVars(window.location.search);
  }

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
    var $item = $("<a href='javascript:void(0)' class='flex-column'></a>");
    var $img = $("<img class='seg-img' src=''>");
    $item.append($img);
    var $control = $("<div class='label-control'></div>");
    // Add the date and time information
    var $dt = $("<p class='text-small-margin'><i></i></p>");
    $control.append($dt)
    $item.append($control);
    return $item;
  }

  function safeGet(v, default_val) {
    return util.safeGet(v, default_val);
  }

  function updateItem($item, v) {
    // Update date and time information
    var src_url = util.buildSegmentationURL(v);
    var $i = $item.children(".label-control").find("i").removeClass();
    var date_str = (new Date(parseInt(v["frame_timestamp"]) * 1000)).toLocaleString("en-GB", {
      timeZone: "Europe/Amsterdam",
      hour: "2-digit",
      minute: "2-digit",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour12: false
    });
    console.log(v)
    $($i.get(0)).html("<a target='_blank' href='" + util.segmentationFeedbackToVideoPanoramaURL(v) + "'>" + date_str + "</a>");
    var $img = $item.find("img");
    $img.prop("src", src_url);
    return $item;
  }

  function updateImages(meta_data) {
    // Add DOM elements
    for (var i = 0; i < meta_data.length; i++) {
      var v = meta_data[i];
      var $item;
      if (typeof image_items[i] === "undefined") {
        $item = createImage();
        image_items.push($item);
        $gallery_images.append($item);
      } else {
        $item = image_items[i];
      }
      $item = updateItem($item, v);
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

  // Read the payload in a JWT
  function getJwtPayload(jwt) {
    return JSON.parse(window.atob(jwt.split('.')[1]));
  }

  function onLoginSuccess(data) {
    user_token = data["user_token"];
    var payload = getJwtPayload(user_token);
    var desired_href_review = "bbox-gallery.html" + "?user_id=" + payload["user_id"];
    $("#review-community").prop("href", desired_href_review);
    $(".community-control").css("display", "flex");
  }

  function onLoginComplete() {
    initPagination();
  }

  function setImageTypeText(method) {
    var $s = $("#image-type-text");
    if (method == "get_pos_labels_seg") {
      $s.text("alle volledig gecontroleerd kaders met rook");
    } else if (method == "get_maybe_pos_labels_seg") {
      $s.text("gecontroleerd kaders die mogelijk rook bevatten");
    }
  }

  function init() {
    $gallery = $(".gallery");
    $gallery_images = $(".gallery-images");
    var query_paras = getQueryParas();
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
    google_account_dialog = new edaplotjs.GoogleAccountDialog();
    if (util.browserSupported()) {
      showGalleryLoadingMsg();
      var ga_tracker = new edaplotjs.GoogleAnalyticsTracker({
        ready: function (ga_obj) {
          google_account_dialog.isAuthenticatedWithGoogle({
            success: function (is_signed_in, google_id_token) {
              if (is_signed_in) {
                util.login({
                  google_id_token: google_id_token
                }, {
                  success: onLoginSuccess,
                  complete: onLoginComplete
                });
              } else {
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