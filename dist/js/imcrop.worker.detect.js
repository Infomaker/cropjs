/**
 * cropjs - Infomaker image auto cropper. (c) Infomaker
 * @author Danne Lundqvist
 * @version v0.0.1
 * @link http://www.infomaker.se
 * @license Unlicense
 */
tracking={},Win=function(){},window=new Win,window.tracking=tracking,importScripts("tracking-min.js"),tracking.trackData=function(a,t,n,r){var i=new tracking.TrackerTask(a);return i.on("run",function(){a.track(t.data,n,r)}),i.run()},onmessage=function(a){var t=a.data[0],n=a.data[1],r=a.data[2],i=a.data[3],c=a.data[4];if("details"==t)return this.postMessage(tracking.Fast.findCorners(tracking.Image.grayscale(n.data,r,i),r,i,c)),void close();if("features"==t){var e=new tracking.ObjectTracker(["face"]),s=this;e.setStepSize(c),e.on("track",function(a){s.postMessage(a.data),close()}),tracking.trackData(e,n,r,i)}};