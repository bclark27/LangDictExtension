
const tmpFiles = await getFileStorage({name: "tmpFiles"});
const file = await tmpFiles.createMutableFile("path/filename.txt");
const fh = file.open("readwrite");
