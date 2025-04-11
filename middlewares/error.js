class ErrorHandler extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorMiddleware = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal server error';

  // Invalid MongoDB ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found. Invalid: ${err.path}`;
    err = new ErrorHandler(message, 400);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `Duplicate ${field} entered.`;
    err = new ErrorHandler(message, 400);
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    const message = `Validation error: ${messages.join(', ')}`;
    err = new ErrorHandler(message, 400);
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    const message = `JSON Web Token is invalid or expired, please try again.`;
    err = new ErrorHandler(message, 400);
  }

  // Multer (file upload) error
  if (err.name === 'MulterError') {
    const message = `File upload error: ${err.message}`;
    err = new ErrorHandler(message, 400);
  }

 


  return res.status(err.statusCode).json({
    success: false,
    message: err.message,
  });
};



export default ErrorHandler;
