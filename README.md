# RikiTraki

This repository contains the code for [RikiTraki.com](http://rikitraki.com), a map-centric hiking log web application. 

The vision for this project is to create a free and open source and data capability for enabling a community of hiking enthusiasts to share captured GPS tracks, visualize them over a variety of base maps as well as 3D terrain, and include useful descriptions and photographs of the destinations. The application can also be used for mapping tracks of any outdoor activities such as biking, running and boating.

Currently, the data is separately maintained under a git submodule over [here](https://github.com/jimmyangel/rikitrakidata) and accessed by the application as static resources. The data has been migrated to a MongoDB document database and it is accessible via a Web Services layer (github repo [here](https://github.com/jimmyangel/rikitrakiws)), both hosted at OpenShift. A preview of the application using these Web Services can be accessed [here](http://rikitraki.com/TestDB). Once the ability to register users and upload tracks is implemented and fully tested, it will replace the current [RikiTraki.com](http://rikitraki.com) site.

**RikiTraki is currently under development - Comments and feedback are greatly appreciated** 