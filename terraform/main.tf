terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "hcloud" {
  token = var.hcloud_token
}

# SSH Key for accessing servers
resource "hcloud_ssh_key" "k3s_key" {
  name       = "k3s-key"
  public_key = file("~/.ssh/id_rsa.pub")  # Change to your SSH key path
}

# Network for k3s cluster
resource "hcloud_network" "k3s_network" {
  name     = "k3s-network"
  ip_range = "10.0.0.0/16"
}

resource "hcloud_network_subnet" "k3s_subnet" {
  network_id   = hcloud_network.k3s_network.id
  type         = "cloud"
  network_zone = "eu-central"
  ip_range     = "10.0.1.0/24"
}

# Firewall rules
resource "hcloud_firewall" "k3s_firewall" {
  name = "k3s-firewall"
  
  rule {
    direction = "in"
    port      = "22"
    protocol  = "tcp"
    source_ips = ["0.0.0.0/0"]
  }
  
  rule {
    direction = "in"
    port      = "6443"
    protocol  = "tcp"
    source_ips = ["0.0.0.0/0"]
  }
  
  rule {
    direction = "in"
    port      = "80"
    protocol  = "tcp"
    source_ips = ["0.0.0.0/0"]
  }
  
  rule {
    direction = "in"
    port      = "443"
    protocol  = "tcp"
    source_ips = ["0.0.0.0/0"]
  }
  
  rule {
    direction = "in"
    protocol  = "tcp"
    source_ips = [hcloud_network.k3s_network.ip_range]
  }
  
  rule {
    direction = "in"
    protocol  = "udp"
    source_ips = [hcloud_network.k3s_network.ip_range]
  }
}

# Generate a random token for k3s cluster
resource "random_password" "k3s_token" {
  length  = 32
  special = false
}

