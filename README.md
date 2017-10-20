# Osm3DWayPlot
Javascript solution for creating 3D plots for OSM way history data.

### Setup:
1. Copy files locally, then simply run index.html on any modern web browser.
2. Or, use online: <https://tiwarihd.github.io/Osm3DWayPlot/>

### Overview:
The foremost use of this tool is to visualize the different versions of an [OpenStreetMap (OSM)](http://www.openstreetmap.org) way in a single 3D plot.

This tool relies on the [OSM web API](http://wiki.openstreetmap.org/wiki/API_v0.6) to fetch OSM data, which can be then processed by the Javascript code in the browser itself.

It is also used to do some basic analysis about the shifting of the ways. More such analysis can be easily added using the functionality provided by Javascript.

### Usage:
Current version of this tool performs following tasks:

#### Fetching a list of ways within a bounding area on the map.
By specifying the coordinates of a map boundary, all the ways within the boundary can be fetched in a drop down list. These ways can then be used in further tasks.

#### Drawing a 3D plot of an OSM way using it's way history.
Also the core functionality of this tool. This can be achieved in two ways. Either by directly entering the way ID in a separate box. Or by selecting a way from the drop down list and clicking the plot button.

#### Checking whether a way was shifted.
This option can be selected for checking whether a way has shifted on a map, i.e. it's shape has remained same and the distances of all nodes from each other, but all the nodes have a new location. Current implementation only compares first and last versions of the nodes of a way.

#### Drawing a 3D plot of the shift of a way.
This method plots two versions of a way denoting the first versions of a node and the second having last versions of the nodes of a way, thus highlighting the shift if present for a way. This can also be done by either directly entering the way ID or selecting from the drop down list.

Further details about the working of this tool can be found in the comments part of the code.
