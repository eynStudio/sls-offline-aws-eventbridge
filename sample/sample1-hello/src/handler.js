const say = async (event) => {
  const { detail } = event;
  console.log("Handler say:", detail);
};

module.exports = { say };
