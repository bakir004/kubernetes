# K3s Worker Nodes
resource "hcloud_server" "k3s_worker" {
  count       = var.worker_count
  name        = "k3s-worker-${count.index + 1}"
  image       = "ubuntu-22.04"
  server_type = "cx21"  # 2 vCPU, 4GB RAM - adjust as needed
  location    = "nbg1"  # Same location as master
  ssh_keys    = [hcloud_ssh_key.k3s_key.id]
  
  network {
    network_id = hcloud_network.k3s_network.id
    ip         = "10.0.1.${20 + count.index}"
  }
  
  firewall_ids = [hcloud_firewall.k3s_firewall.id]
  
  user_data = templatefile("${path.module}/scripts/install-k3s-worker.sh", {
    master_public_ip = hcloud_server.k3s_master.ipv4_address
    token            = random_password.k3s_token.result
  })
  
  labels = {
    role = "worker"
    k3s  = "true"
  }
  
  depends_on = [hcloud_server.k3s_master]
}

