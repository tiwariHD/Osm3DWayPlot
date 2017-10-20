//Javascipt file for 3D plotting of OSM way data

var waysData = {};
var nodesData = new Map();
var waysList = [];
var shiftedWaysL = [];
var singleWays = 0;
var shiftDistance = 0.0;
var shiftBearing = 0.0;

/*getNodes retrieves node history data for a node specified by nodeId;
  calls OSM api using jQuery;
  stores the node data to a map data structure;
  returns none.
*/
function getNodes(nodeId) {
  var baseNodeUri = 'https://www.openstreetmap.org/api/0.6/node/';

  jQuery.ajax({
        url: baseNodeUri + nodeId + "/history",
        type: 'GET',
        async: false,
    }).done(function(data) {
      nodesData.set(nodeId, data);
    }).fail(function(error) {
        console.log("getNodes: " + error);
    });
}

/*getWays retrieves way history data for a way specified by wayId;
  calls OSM api using jQuery for way data;
  calls getNodes to retrieve data for all nodes;
  stores way data to gloabl variable;
  returns no. of versions of ways.
*/
function getWays(wayId, fetchNodes = true) {

  var baseWayUri = 'https://www.openstreetmap.org/api/0.6/way/';
  var wayLength = 0;

  jQuery.ajax({
        url: baseWayUri + wayId + "/history",
        type: 'GET',
        async: false,
    }).done(function(data) {
      //get way data for all versions
      waysData = data.getElementsByTagName("way");
      wayLength = waysData.length;
      if (fetchNodes) {
        for(var i = 0; i < wayLength; i++) {

          //for each version, get it's list of nodes
          var nds = waysData[i].getElementsByTagName("nd");
          for(var j = 0; j < nds.length; j++) {

            var nodeId = nds[j].getAttribute("ref");
            //if node history data is not present, then call getNodes
            if (nodesData.has(nodeId) == false) {
              getNodes(nodeId);
            }
          }
        }
      }
    }).fail(function(error) {
      alert("Error fetching way data!!");
      return 0;
    });

    return wayLength;
}

/*threeDPlot uses the library Plotly.js for 3D plotting;
  initializes the plot data and layout, then calls library plot function.
*/
function threeDPlot(plotData, titleStr) {

    //data for 3D plot
    var data = [{
      x: plotData[0],
      y: plotData[1],
      z: plotData[2],
      mode: 'lines+markers',
      type: 'scatter3d',
      line: {
        width: 3,
        color: plotData[3],
        colorscale: "Jet"
      },
      marker: {
        color: plotData[3],
        colorscale: "Jet",
        size: 3
      }}];

    //layout data for 3D plot
    var layout = {
      autosize: true,
      height: 960,
      scene: {
        aspectratio: {
          x: 1,
          y: 1,
          z: 1
        },
        camera: {
          center: {
            x: 0,
            y: 0,
            z: 0
          },
          eye: {
            x: 1.25,
            y: 1.25,
            z: 1.25
          },
          up: {
            x: 0,
            y: 0,
            z: 1
          }
        },
        xaxis: {
          type: 'linear',
          zeroline: false
        },
        yaxis: {
          type: 'linear',
          zeroline: false
        },
      },
      title: titleStr,
      width: 954
    };

    //function creating a new plot over div element
    Plotly.newPlot('myDiv', data, layout);
}

/*plotWay is the main function for managing all data related to plot;
  calls getWays to load waysData and nodesData, the populates the plotData;
  calls threeDPlot for plotting and also updates status.
*/
function plotWay(wayId) {

  //Reseting plot data
  Plotly.purge(myDiv);
  /*plotData has 4 arrays for:
  plotData[0] : latitude, plotData[1] : longitude,
  plotData[2] : timestamps, plotData[3] : color,
  */
  waysData = {};
  nodesData.clear();
  var plotData = [[], [], [], []];

  var statusText = "Fetching way data..<br>";
  document.getElementById("status").innerHTML = statusText;

  //timing the api calls
  var t1 = new Date().getTime();
  var versions = getWays(wayId);
  var t2 = new Date().getTime();
  statusText += "Time taken to fetch: " + (t2 - t1) / 1000 + " sec <br>";

  //barrier synchronization for asynchronous requests
  //jQuery(document).ajaxStop(function() {
  //}

  //if getWays fails then does not call the plotting function
  if (versions != 0) {

    //collects node data for each way version and pushes to plotData
    for(var i = 0; i < waysData.length; i++) {

      var nds = waysData[i].getElementsByTagName("nd");
      var wayChangeset = Number(waysData[i].getAttribute("changeset"));
      var timestamp = new Date(waysData[i].getAttribute("timestamp"));

      for(var j = 0; j < nds.length; j++) {
        var nodeId = nds[j].attributes.ref.nodeValue;
        var ndData = nodesData.get(nodeId).getElementsByTagName("node");
        var k;
        for(k = (ndData.length - 1); k >= 0; k--) {

          /*checking for corresponding node version using changeset;
            this makes sure that a particular node version is updated before way
          */
          ndChangeset = Number(ndData[k].getAttribute("changeset"));
          if(wayChangeset >= ndChangeset) {
            break
          }
        }

        /*corner case: some data has wrong changeset information;
          using timestamp with a small absolute time difference might solve it
        */
        if(k == -1) {
          k = 0;
          console.log("Data error!");
          console.log("nodeId: " + nodeId);
          console.log("Way: " + wayChangeset + ", Node: " + ndData[0].getAttribute("changeset"));
        }

        //load the data for plotting
        plotData[0].push(ndData[k].getAttribute("lat"));
        plotData[1].push(ndData[k].getAttribute("lon"));
        plotData[2].push(timestamp);
        plotData[3].push(i);
      }
    }

    if (versions == 1) {
      var index = plotData[0].length - 1;
      plotData[0].push(plotData[0][index]);
      plotData[1].push(plotData[1][index]);
      plotData[2].push(new Date());
      plotData[3].push(plotData.length);
      statusText += "***Versions=1, so added a reference point at last node with current timestamp***<br>";
    }

    var titleStr = "";
    if (waysData[0].getElementsByTagName("tag")[0]) {
      var tagkey = waysData[0].getElementsByTagName("tag")[0].getAttribute("k");
      var tagvalue = waysData[0].getElementsByTagName("tag")[0].getAttribute("v");
      titleStr = "Way ID: " + wayId + ", Versions: " + versions + ", " + tagkey + ": " + tagvalue;
    } else {
      titleStr = "Way ID: " + wayId + ", Versions: " + versions + ", No tags!";
    }

    //plot function called now
    threeDPlot(plotData, titleStr);

    var t2 = new Date().getTime();
    statusText += "Total Time: " + (t2 - t1) / 1000 + " sec <br>";
    statusText += "Way ID: " + wayId + " plotted <br>";
    document.getElementById("status").innerHTML = statusText;
  }
}

/*clearDropDownList erases elements from dropdown list;
  required everytime new way list is requested.
*/
function clearDropDownList(selectbox) {
    for(var i = selectbox.options.length - 1 ; i >= 0 ; i--) {
        selectbox.remove(i);
    }
}

/*getWayIDList takes bounding box parameters from UI and
  diplays the way list on the dropdown bar;
  calls overpass api to load map data, then searches for all ways and
  returns way list;
  also updates status information.
*/
function getWayIDList(showList = true) {

  waysList.length = 0;

  //update status
  var statusText = "Fetching way list data..<br>";
  document.getElementById("status").innerHTML = statusText;
  var t1 = new Date().getTime();

  //get bounding box information from UI form
  var left = document.getElementById("minlon").value;
  var bottom = document.getElementById("minlat").value;
  var right = document.getElementById("maxlon").value;
  var top = document.getElementById("maxlat").value;

  //clear drop down list before populating
  var select = document.getElementById("wayIdList");
  clearDropDownList(select);

  //using overpass api for fetching bounding box
  var baseBBUri = 'https://overpass-api.de/api/map?bbox=';
  var osmUri = baseBBUri + left + ',' + bottom + ',' + right + ',' + top;

  jQuery.ajax({
        url: osmUri,
        type: 'GET',
        async: false,
    }).done(function(data) {
      var ways = data.getElementsByTagName("way");
      //console.log("Length: " + ways.length);
      for(var i = 0; i < ways.length; i++) {
        var wId = ways[i].getAttribute("id");
        waysList.push(wId);
        if (showList) {
          var el = document.createElement("option");
          el.textContent = wId
          el.value = wId
          select.appendChild(el);
        }
      }
      statusText += ways.length + " ways fetched. <br>";
    }).fail(function(error) {
        alert("Error fetching way list!!");
    });

  var t2 = new Date().getTime();
  statusText += "Time taken: " + (t2 - t1) / 1000 + " sec <br>";
  document.getElementById("status").innerHTML = statusText;
}

/*plotShiftedWay is a special plotting function for shifted ways;
  unlike plotWay all versions of ways, instead it plots only two versions
  which have the first and last versions of nodes.
  calls threeDPlot for plotting and also updates status.
*/
function plotShiftedWay(wayId) {

  //Reseting plot data
  Plotly.purge(myDiv);
  /*plotData has 4 arrays for:
  plotData[0] : latitude, plotData[1] : longitude,
  plotData[2] : timestamps, plotData[3] : color,
  */
  waysData = {};
  nodesData.clear();
  var plotData = [[], [], [], []];

  var statusText = "Fetching way data..<br>";
  document.getElementById("status").innerHTML = statusText;

  //timing the api calls
  var t1 = new Date().getTime();
  var versions = getWays(wayId, false);
  var t2 = new Date().getTime();
  statusText += "Time taken to fetch: " + (t2 - t1) / 1000 + " sec <br>";


  //if getWays fails then does not call the plotting function
  if (versions > 1) {

    //collects node data for each way version and pushes to plotData
    var wayShiftData0 = [];
    var wayShiftData1 = [];

    var nds = waysData[0].getElementsByTagName("nd");
    for(var i = 0; i < nds.length; i++) {
      var nodeCord = getShiftNodes(nds[i].getAttribute("ref"));
      //console.log(nodeCord);
      wayShiftData0.push(nodeCord[0]);
      wayShiftData1.push(nodeCord[1]);
    }
    console.log(wayShiftData0[0], wayShiftData0[1]);
    console.log(wayShiftData1[0], wayShiftData1[1]);

    //load the data for plotting
    for(var i = 0; i < wayShiftData0.length; i++) {
      plotData[0].push(wayShiftData0[i][0]);
      plotData[1].push(wayShiftData0[i][1]);
      plotData[2].push(new Date(waysData[0].getAttribute("timestamp")));
      plotData[3].push(1);
    }
    for(var i = 0; i < wayShiftData1.length; i++) {
      plotData[0].push(wayShiftData1[i][0]);
      plotData[1].push(wayShiftData1[i][1]);
      plotData[2].push(new Date(waysData[waysData.length - 1].getAttribute("timestamp")));
      plotData[3].push(2);
    }

    var titleStr = "";
    if (waysData[0].getElementsByTagName("tag")[0]) {
      var tagkey = waysData[0].getElementsByTagName("tag")[0].getAttribute("k");
      var tagvalue = waysData[0].getElementsByTagName("tag")[0].getAttribute("v");
      titleStr = "Way ID: " + wayId + ", Versions: " + versions + ", " + tagkey + ": " + tagvalue;
    } else {
      titleStr = "Way ID: " + wayId + ", Versions: " + versions + ", No tags!";
    }

    //plot function called now
    threeDPlot(plotData, titleStr);

    var t2 = new Date().getTime();
    statusText += "Total Time: " + (t2 - t1) / 1000 + " sec <br>";
    statusText += "Way ID: " + wayId + " plotted <br>";
    document.getElementById("status").innerHTML = statusText;
  } else {
    alert("No of versions is 1 !!");
  }
}

/*getShiftNodes fetches node information and returns the node value of it's
  first and last version;
  returns array.
*/
function getShiftNodes(nodeId) {
  var baseNodeUri = 'https://www.openstreetmap.org/api/0.6/node/';
  var retVal = [[], []];

  jQuery.ajax({
        url: baseNodeUri + nodeId + "/history",
        type: 'GET',
        async: false,
    }).done(function(data) {
      var temp = data.getElementsByTagName("node");
      retVal[0].push(temp[0].getAttribute("lat"));
      retVal[0].push(temp[0].getAttribute("lon"));
      if (temp.length == 1) {
        retVal[1] = retVal[0];
      } else {
        retVal[1].push(temp[temp.length - 1].getAttribute("lat"));
        retVal[1].push(temp[temp.length - 1].getAttribute("lon"));
      }

    }).fail(function(error) {
        console.log("getNodes: " + error);
    });

    return retVal;
}

/*radians converts from degrees to randians
*/
function radians(n) {
  return n * (Math.PI / 180);
}

/*degrees converts from radians to degrees
*/
function degrees(n) {
  return n * (180 / Math.PI);
}

/*getDistanceFromLatLon calculates distance between two coordinates;
  returns ditance in metres.
*/
function getDistanceFromLatLon(lat1,lon1,lat2,lon2) {
  var R = 6371008; // Radius of the earth in m
  var dLat = radians(lat2-lat1);  // deg2rad below
  var dLon = radians(lon2-lon1);
  var a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(radians(lat1)) * Math.cos(radians(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ;
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  var d = R * c; // Distance in m
  return d;
}

/*getBearing calculates the direction of change between two coordinates;
  returns bearing in degrees.
*/
function getBearing(startLat,startLong,endLat,endLong){
  startLat = radians(startLat);
  startLong = radians(startLong);
  endLat = radians(endLat);
  endLong = radians(endLong);

  var dLong = endLong - startLong;

  var dPhi = Math.log(Math.tan(endLat/2.0+Math.PI/4.0)/Math.tan(startLat/2.0+Math.PI/4.0));
  if (Math.abs(dLong) > Math.PI){
    if (dLong > 0.0)
       dLong = -(2.0 * Math.PI - dLong);
    else
       dLong = (2.0 * Math.PI + dLong);
  }

  return (degrees(Math.atan2(dLong, dPhi)) + 360.0) % 360.0;
}

/*checkWayShift checks for shift between first and last versions of a way;
  it compares distances between two corresponding nodes of a version with
  another, which for successfull case should be same;
  returns true or false.
*/
function checkWayShift(nds) {
  var wayShiftData0 = [];
  var wayShiftData1 = [];

  for(var i = 0; i < nds.length; i++) {
    var nodeCord = getShiftNodes(nds[i].getAttribute("ref"));
    if ((nodeCord[0][0] == nodeCord[1][0]) && (nodeCord[0][1] == nodeCord[1][1])) {
      //no shift in nodes
      return false;
    } else {
        wayShiftData0.push(nodeCord[0]);
        wayShiftData1.push(nodeCord[1]);
    }
  }

  //distances denote distance between two nodes of same version of way
  for(var i = wayShiftData0.length - 1; i > 0; i--) {
    var d1 = getDistanceFromLatLon(wayShiftData0[i][0], wayShiftData0[i][1],
    wayShiftData0[i-1][0], wayShiftData0[i-1][1]);
    var d2 = getDistanceFromLatLon(wayShiftData1[i][0], wayShiftData1[i][1],
    wayShiftData1[i-1][0], wayShiftData1[i-1][1]);

    var tol = 1e-2; // 1 cm
    if (Math.abs(d1 - d2) > tol) {
      return false;
    }
    console.log("Diff: " + i + " = " + Math.abs(d1 - d2) + ", d1: " + d1 + ", d2: " + d2);
  }

  // true case, shift distance and bearing information saved in global var
  shiftDistance = getDistanceFromLatLon(wayShiftData0[0][0], wayShiftData0[0][1],
  wayShiftData1[0][0], wayShiftData1[0][1]);
  shiftBearing = getBearing(wayShiftData0[0][0], wayShiftData0[0][1],
  wayShiftData1[0][0], wayShiftData1[0][1]);
  return true;
}

/*checkSameNodes compares nodes between two versions of a way
  returns true or false.
*/
function checkSameNodes(nds1, nds2) {

  //check for same no of nodes
  if (nds1.length != nds2.length) {
    return false;
  }

  //compare names of both versions
  for(var i = 0; i < nds1.length; i++) {
    if (nds1[i].getAttribute("ref") != nds2[i].getAttribute("ref")) {
      return false;
    }
  }

  return true;
}

/*checkWay fetches way data and calls checkWayShift if the no of
  nodes is same in all the way versions;
  returns true or false.
*/
function checkWay(wayId) {

  var baseWayUri = 'https://www.openstreetmap.org/api/0.6/way/';
  var wayLength = 0;
  var retVal = false;
  var sameNodes = true;
  var tempWays = {};

  jQuery.ajax({
        url: baseWayUri + wayId + "/history",
        type: 'GET',
        async: false,
    }).done(function(data) {
      //get way data for all versions
      tempWays = data.getElementsByTagName("way");
      wayLength = tempWays.length;
      if(wayLength == 1) {
        singleWays += 1;
      } else {
        //first check no of nodes in each version
        var nds1 = tempWays[0].getElementsByTagName("nd");
        for(var i = 1; i < wayLength; i++) {

          //for each version, get it's list of nodes
          var nds2 = tempWays[i].getElementsByTagName("nd");
          //check for same set of nodes
          if (checkSameNodes(nds1, nds2) == false) {
            sameNodes = false;
            break;
          }
        }
        //after this step we get ways with same nodes
        if (sameNodes == true) {
          if (checkWayShift(nds1) == true) {
            retVal = true;
          } else {
            //console.log("node same but not shifted, Id: ", wayId);
          }
        }
      }
    }).fail(function(error) {
      alert("Error fetching way data!!");
      return false;
    });

    return retVal;
}

/*For 8.6528,8.7294, 49.3683,49.4376, shifted ways:
25208646,36208802,80277574,87204801,87412899,87728318,87728549,87728681,
87728712,88230330,88316016,90139777,90139828,90234697,90242372,90868121,91062574,
91065608,91091899,91092022,91097335,91234247,91234279,91237825,91237964,91598855,
91598874,91598969,92158515,92158530,92158541,92158550,92158559,92158614,92158616,
92512481,92512537,92512596,92512612,92512682,92512729,92512739,92512802,92525395,
92525475,92525484,92525485,92525554,92719073,92719086,92725988,92725990,92726025,
92729559,92729669,92729702,92729736,92729747,92849386,93350723,93353565,93353593,
93394030,93880448,96690371,97953631,98231021,98231078,99071036,99071174,99071226,
99905731,99905961,99907069,100525157,100525172,100525174,100525187,101815550,
101815563,101815710,101815726,101815803,123816105 */

/*getShiftedWayIDList calls getWayIDList() to load all the ways in
  in the bounding box specified;
  then checks all the ways to find shifted ways;
  also updates status information.
*/
function getShiftedWayIDList() {

  getWayIDList(false);

  var statusText = "Total ways: " + waysList.length + "<br>";
  statusText += "Fetching shifted way list..<br>";
  document.getElementById("status").innerHTML = statusText;

  singleWays = 0;
  var count = 0;
  //select and clear drop down list before populating
  var select = document.getElementById("wayIdList");
  clearDropDownList(select);

  for(var i = 0; i < waysList.length; i++) {
    var wId = waysList[i];

    if(checkWay(wId) == true) {
      shiftedWaysL.push(wId);
      var el = document.createElement("option");
      el.textContent = wId;
      el.value = wId;
      select.appendChild(el);
      count++;
      console.log("Found a shifted way, no: ", count);
    }
  }

  statusText += "Ways with shift: " + count + "<br>";
  statusText += "Ways with single version: " + singleWays + "<br>";
  document.getElementById("status").innerHTML = statusText;
}

/*shiftedWayFromList retrieves wayId from dropdown list and calls plotShiftedWay
*/
function shiftedWayFromList() {
  var wayList = document.getElementById("wayIdList");
  var wayId = wayList.options[wayList.selectedIndex].value;
  plotShiftedWay(wayId);
}

/*submitWayFromList retrieves wayId from dropdown list and calls plotWay
*/
function submitWayFromList() {
  var wayList = document.getElementById("wayIdList");
  var wayId = wayList.options[wayList.selectedIndex].value;
  plotWay(wayId);
}

/*submitWay retrieves wayId from text box and calls plotWay
*/
function submitWay() {
  var wayId = document.getElementById("wayID").value;
  plotWay(wayId);
}

/*checkWayShifted retrieves wayId from text box and checks for shift
*/
function checkWayShifted() {
  var wayId = document.getElementById("wayIDShift").value;
  var statusText = "Checking way ID: " + wayId + " for shift..<br>";
  document.getElementById("status").innerHTML = statusText;

  if(checkWay(wayId) == true) {
    statusText += "Way is shifted!!<br>" ;
    statusText += "Shift distance: " + shiftDistance.toFixed(2) + " m<br>";
    statusText += "Bearing: " + shiftBearing.toFixed(2) + " deg<br>";
  } else {
    statusText += "Way does not shift!!<br>" ;
  }
  document.getElementById("status").innerHTML = statusText;
}

/*submitWayShifted retrieves wayId from text box and calls plotShiftedWay
*/
function submitWayShifted() {
  var wayId = document.getElementById("wayIDShift").value;
  plotShiftedWay(wayId);
}

/*function to clear the 3D plot before reloading
*/
window.onbeforeunload = function() {
  Plotly.purge(myDiv);
};
