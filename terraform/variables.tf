variable "hcloud_token" {
  description = "Hetzner Cloud API Token"
  type        = string
  sensitive   = true
}

variable "worker_count" {
  description = "Number of worker nodes"
  type        = number
  default     = 2
}

variable "server_type" {
  description = "Hetzner server type (cx21, cx31, etc.)"
  type        = string
  default     = "cx21"
}

variable "location" {
  description = "Hetzner location (nbg1, fsn1, hel1, etc.)"
  type        = string
  default     = "nbg1"
}

