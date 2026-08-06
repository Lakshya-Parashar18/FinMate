const logger = {
  info: (msg, meta = {}) => {
    console.log(JSON.stringify({ 
      level: 'info', 
      message: msg, 
      timestamp: new Date().toISOString(), 
      ...meta 
    }));
  },
  error: (msg, err = {}) => {
    console.error(JSON.stringify({ 
      level: 'error', 
      message: msg, 
      error: err.stack || err.message || err, 
      timestamp: new Date().toISOString() 
    }));
  },
  warn: (msg, meta = {}) => {
    console.warn(JSON.stringify({ 
      level: 'warn', 
      message: msg, 
      timestamp: new Date().toISOString(), 
      ...meta 
    }));
  }
};

export default logger;
