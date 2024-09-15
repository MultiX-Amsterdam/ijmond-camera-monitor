(function () {
  "use strict";

  var util = new edaplotjs.Util();
  var $gallery_no_data_text = $('<span class="gallery-no-data-text">No videos are found.</span>');
  var $gallery_error_text = $('<span class="gallery-error-text">Oops!<br>Server may be down or busy.<br>Please come back later.</span>');
  var $gallery_loading_text = $('<span class="gallery-loading-text"></span>');
  var $gallery_not_supported_text = $('<span class="gallery-not-supported-text">We are sorry!<br>Your browser is not supported.</span>');
  var $gallery;
  var $gallery_events;
  var cached_event_items = [];
  var $page_nav;
  var $page_back;
  var $page_next;
  var $page_control;
  var current_date_str;
  var data_for_current_date;
  var event_dict_by_date = {};
  var base_url;

  function updateGallery($new_content) {
    $gallery_events.detach(); // detatch prevents the click event from being removed
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

  // Create an image element
  function createImage() {
    var $item = $("<a class='flex-column'></a>");
    var $img = $("<img>");
    $item.append($img);
    var $control = $("<div class='label-control'></div>");
    // Add lines for displaying video metadata
    var n_lines = 3;
    for (var i = 0; i < n_lines; i++) {
      $control.append($("<p class='text-small-margin'><i></i></p>"));
    }
    $item.append($control);
    return $item;
  }

  function updateItem($item, v) {
    // Update event metadata
    var $i = $item.children(".label-control").find("i").removeClass();
    var format_date_str = v["date_obj"].toLocaleString("nl-NL", {
    //var format_date_str = v["date_obj"].toLocaleString("en-US", {
      timeZone: "Europe/Amsterdam",
      day: 'numeric', // Day of the month (e.g., 25)
      month: 'long', // Full month name (e.g., juni)
      year: 'numeric', // Full year (e.g., 2024)
      hour: '2-digit', // Hour (e.g., 15)
      minute: '2-digit', // Minutes (e.g., 45)
      hour12: false
    });
    $($i.get(0)).text(v["camera_str"]).addClass("custom-text-info-dark-theme");
    $($i.get(1)).html("<a target='_blank' href='" + base_url + v["video_url_part"] + "'>" + format_date_str + "</a>");
    var s = v["camera_str"]; // camera name string
    var d = v["date_str"]; // date string
    var t = 0; // starting time
    var bt = v["share_date_str"] // begin time
    var et = bt // begin time
    t = Math.round(t * 1000) / 1000
    var href = "https://breathecam.multix.io/#v=960,540,0,pts&t=" + t + "&bt=" + bt + "&et=" + et + "&ps=25&d=" + d + "&s=" + s;
    $($i.get(2)).html("<a target='_blank' href='" + href + "'>Link naar Camerabeelden</a>");
    // Update image
    var $img = $item.find("img");
    $img.prop("src", base_url + v["annotated_frame_url_part"]);
    return $item;
  }

  function updateEvents(event_data) {
    // Add events
    for (var i = 0; i < event_data.length; i++) {
      var v = event_data[i];
      var $item;
      if (typeof cached_event_items[i] === "undefined") {
        $item = createImage();
        cached_event_items.push($item);
        $gallery_events.append($item);
      } else {
        $item = cached_event_items[i];
      }
      $item = updateItem($item, v);
      if ($item.hasClass("force-hidden")) {
        $item.removeClass("force-hidden");
      }
    }
    // Hide exceeding event items
    for (var i = event_data.length; i < cached_event_items.length; i++) {
      var $item = cached_event_items[i];
      if (!$item.hasClass("force-hidden")) {
        $item.addClass("force-hidden");
      }
    }
  }

  function setPagination(data_sources) {
    if (typeof data_sources === "undefined") {
      onPagination();
      return false;
    }

    // Set the pagination UI
    $page_nav = $("#page-navigator").pagination({
      dataSource: data_sources,
      className: "paginationjs-custom",
      pageSize: 8,
      showPageNumbers: false,
      showNavigator: true,
      showGoInput: true,
      showGoButton: true,
      showPrevious: false,
      showNext: false,
      callback: function (data, pagination) {
        onPagination(data, pagination);
      }
    });
    $page_back.off().on("click", function () {
      showGalleryLoadingMsg();
      $page_nav.pagination("previous");
    });
    $page_next.off().on("click", function () {
      showGalleryLoadingMsg();
      $page_nav.pagination("next");
    });
  }

  function onPagination(data, pagination) {
    if (typeof data !== "undefined" && data.length > 0) {
      updateGallery($gallery_events);
      updateEvents(data);
    } else {
      showNoGalleryMsg();
    }
    // Handle UI
    if (typeof pagination === "undefined") {
      if (!$page_control.hasClass("force-hidden")) {
        $page_control.addClass("force-hidden");
      }
      return false;
    }
    var total_page = Math.ceil(pagination["totalNumber"] / pagination["pageSize"]);
    if (typeof total_page !== "undefined" && !isNaN(total_page) && total_page > 1) {
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

  function setShareUrl(date_str) {
    var updated_query_url = "?date=" + date_str;
    var replaced = window.location.protocol + "//" + window.location.hostname + window.location.pathname + updated_query_url;
    window.history.replaceState("shareURL", "Title", replaced);
  }

  function setDateFilterDropdown(date_str_list) {
    // Set current date from the query url
    var query_paras = util.parseVars(window.location.search);
    if ("date" in query_paras) {
      if (date_str_list.indexOf(query_paras["date"]) > -1) {
        current_date_str = query_paras["date"];
      }
    }
    if (date_str_list.indexOf(current_date_str) == -1) {
      current_date_str = date_str_list[0];
    }

    // Set date dropdown
    var $date_filter = $("#date-filter");
    for (var i = 0; i < date_str_list.length; i++) {
      var k = date_str_list[i];
      var $option;
      if (k == current_date_str) {
        $option = $('<option selected value="' + k + '">' + k + '</option>');
      } else {
        $option = $('<option value="' + k + '">' + k + '</option>');
      }
      $date_filter.append($option);
    }
    $date_filter.off().on("change", function () {
      onDateChange($(this).val());
    });

    // Set to the default date
    onDateChange(current_date_str);
  }

  function onDateChange(desired_date_str) {
    current_date_str = desired_date_str;
    if (typeof $page_nav !== "undefined") {
      $page_nav.pagination("destroy");
    }
    data_for_current_date = event_dict_by_date[desired_date_str];
    setPagination(data_for_current_date);
    setShareUrl(current_date_str);
    updateEventTimeLine();
  }

  function updateEventTimeLine() {
    drawEventTimeline(data_for_current_date);
  }

  function correctTimestamp(original_timestamp_in_millisec) {
    // This function is used to fix the timezone problem
    // We need to consider the timezone offset difference between the browser and the Europe/Amsterdam time
    // We want to show the timeline in Europe/Amsterdam, but google chart uses local time
    var d = new Date(original_timestamp_in_millisec);
    d = moment.tz(d, "Europe/Amsterdam");
    var original_timezone_offset_in_min = d.utcOffset();
    var browser_timezone_offset_in_min = -new Date().getTimezoneOffset();
    var diff_timezone_offset_in_min = original_timezone_offset_in_min - browser_timezone_offset_in_min;
    return original_timestamp_in_millisec + diff_timezone_offset_in_min * 60000;
  }

  function copyAndReplaceHMS(date_obj, hour, minute, second) {
    var cp_date_obj = new Date(date_obj.getTime());
    cp_date_obj.setHours(hour);
    cp_date_obj.setMinutes(minute);
    cp_date_obj.setSeconds(second);
    return cp_date_obj;
  }

  function drawEventTimeline(data) {
    var container = document.getElementById("event-timeline");
    var $container = $(container);
    if (typeof data === "undefined" || data.length == 0) {
      $container.hide();
      return false;
    }
    $container.empty().show(); // need this line to resize properly
    var data_rows = [];
    for (var i = 0; i < data.length; i++) {
      var start_time = data[i]["date_obj"];
      var end_time = new Date(start_time);
      end_time.setSeconds(end_time.getSeconds() + 1);
      data_rows.push(["Event", start_time, end_time]);
    }

    var chart = new google.visualization.Timeline(container);
    var dataTable = new google.visualization.DataTable();
    dataTable.addColumn({
      type: "string",
      id: "Event"
    });
    dataTable.addColumn({
      type: "date",
      id: "Start"
    });
    dataTable.addColumn({
      type: "date",
      id: "End"
    });
    dataTable.addRows(data_rows);

    var options = {
      timeline: {
        showRowLabels: false,
        showBarLabels: false,
        singleColor: "#666"
      },
      avoidOverlappingGridLines: false,
      tooltip: {
        trigger: false
      },
      height: 140,
      width: "100%",
      enableInteractivity: false,
      hAxis: {
        format: "h a",
        minValue: copyAndReplaceHMS(data_rows[0][1], 6, 0, 0), // 6 am
        maxValue: copyAndReplaceHMS(data_rows[0][1], 21, 0, 0) // 9 pm
      }
    };
    google.visualization.events.addListener(chart, "ready", function () {
      var labels = container.getElementsByTagName("text");
      Array.prototype.forEach.call(labels, function (label) {
        if (["middle", "start", "end"].indexOf(label.getAttribute("text-anchor")) > -1) {
          label.setAttribute("fill", "#ffffff");
          label.setAttribute("y", label.getAttribute("y") - 5);
          label.setAttribute("font-weight", "normal");
          label.setAttribute("font-family", "'Source Sans Pro', Arial");
        }
      });
      var divs = container.getElementsByTagName("div");
      Array.prototype.forEach.call(divs, function (div) {
        if (div.getAttribute("dir") === "ltr") {
          $(div).css("height", "60px");
        }
      });
      var svgs = container.getElementsByTagName("svg");
      Array.prototype.forEach.call(svgs, function (svg) {
        svg.setAttribute("height", "60");
      });
    });
    chart.draw(dataTable, options);
  }

  function init() {
    $page_control = $("#page-control");
    $page_back = $("#page-back");
    $page_next = $("#page-next");
    $gallery = $(".gallery");
    $gallery_events = $(".gallery-events");

    // Check browser support
    if (util.browserSupported()) {
      showGalleryLoadingMsg();
    } else {
      console.warn("Browser not supported.");
      showGalleryNotSupportedMsg();
      return;
    }

    // Load the Visualization API and the timeline package.
    google.charts.load("current", {
      packages: ["timeline"]
    });

    // Set a callback to run when the Google Visualization API is loaded.
    google.charts.setOnLoadCallback(function () {
      // Load event data
      $.getJSON(util.getRootApiUrl() + "cached_smoke", function (data) {
        base_url = data["base_url"] + "/";
        var events = data["gifwolken"];
        for (let i = 0; i < events.length; i++) {
          const e = events[i];
          if (e["annotated_frame_uri"]) {
            const time_str = e["approximate_detection_timestamp"];
            const moment_obj = moment.utc(time_str, "YYYY-MM-DD HH:mm:ss.SSSSSS");
            moment_obj.subtract(40, "seconds"); // substract some time to go back a little bit
            const share_date_str = moment_obj.format("YYYYMMDDHHmmss");
            const epochTime = moment_obj.valueOf();
            const corrected_epochtime = correctTimestamp(epochTime);
            const date_obj = new Date(corrected_epochtime);
            const date_str = date_obj.toISOString().split("T")[0];
            if (!event_dict_by_date[date_str]) {
              event_dict_by_date[date_str] = [];
            }
            const camera_str_match = e["annotated_frame_uri"].split("/")[2].split("__")[0];
            var camera_str = "kooks_fabriek_2";
            if (camera_str_match == "kooks_2") {
              camera_str = "kooks_fabriek_2";
            } else if (camera_str_match == "kooks_1") {
              camera_str = "kooks_fabriek_1";
            }
            event_dict_by_date[date_str].unshift({
              "video_url_part": e["segment_video_uri"],
              "annotated_frame_url_part": e["annotated_frame_uri"],
              "date_obj": date_obj,
              "date_str": date_str,
              "camera_str": camera_str,
              "share_date_str": share_date_str
            });
          }
        }
        setDateFilterDropdown(Object.keys(event_dict_by_date));
      });
    });

    // Resize the timeline chart when window size changes
    $(window).resize(function () {
      updateEventTimeLine();
    });

    var google_account_dialog = new edaplotjs.GoogleAccountDialog();
    var ga_tracker = new edaplotjs.GoogleAnalyticsTracker({
      ready: function () {
        google_account_dialog.isAuthenticatedWithGoogle();
      }
    });
  }

  $(init);
})();