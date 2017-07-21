//Javascipt file for 3D plotting of OSM way data

var waysData = {};
var nodesData = new Map();

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
function getWays(wayId) {

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

    var tagkey = waysData[0].getElementsByTagName("tag")[0].getAttribute("k");
    var tagvalue = waysData[0].getElementsByTagName("tag")[0].getAttribute("v");
    var titleStr = "Way ID: " + wayId + ", Versions: " + versions + ", " + tagkey + ": " + tagvalue;

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
function getWayIDList() {

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
        var el = document.createElement("option");
        el.textContent = ways[i].getAttribute("id");
        el.value = ways[i].getAttribute("id");
        select.appendChild(el);
      }
      statusText += ways.length + " ways fetched. <br>";
    }).fail(function(error) {
        alert("Error fetching way list!!");
    });

  var t2 = new Date().getTime();
  statusText += "Time taken: " + (t2 - t1) / 1000 + " sec <br>";
  document.getElementById("status").innerHTML = statusText;
}

/*submitWayFromList retrieves wayId from dropdown list and calls plotWay
*/
function submitWayFromList() {
  var wayList = document.getElementById("wayIdList");
  var wayId = wayList.options[wayList.selectedIndex].value;
  plotWay(wayId);
}

/*submitWayFromList retrieves wayId from text box and calls plotWay
*/
function submitWay() {
  var wayId = document.getElementById("wayID").value;
  plotWay(wayId);
}

/*function to clear the 3D plot before reloading
*/
window.onbeforeunload = function() {
  Plotly.purge(myDiv);
};
