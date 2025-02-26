variable "region" {
  description = "AWS region to deploy the function in."
  default     = "ap-east-1"
}

variable "mongodb_uri" {
  description = "MongoDB connection URI. The value will be passed to the Lambda function as environment variable MONGODB_URI."
  sensitive   = true
}
