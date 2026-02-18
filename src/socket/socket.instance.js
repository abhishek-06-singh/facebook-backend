let ioInstance = null;

const setSocket = (io) => {
  ioInstance = io;
};

const getSocket = () => ioInstance;

module.exports = {
  setSocket,
  getSocket,
};
