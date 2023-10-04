const fs = require("fs");

const deleteFile = (filePath) => {
  fs.unlink(filePath, (err) => {
    if (err) {
      throw new Error("there is an error!");
    }
  });
};

exports.deleteFile = deleteFile;
