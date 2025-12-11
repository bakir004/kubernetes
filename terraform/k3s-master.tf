# K3s Master Node
resource "hcloud_server" "k3s_master" {
  name        = "k3s-master"
  image       = "ubuntu-22.04"
  server_type = "cx21"  # 2 vCPU, 4GB RAM - adjust as needed
  location    = "nbg1"  # Nuremberg - change to your preferred location
  ssh_keys    = [hcloud_ssh_key.k3s_key.id]
  
  network {
    network_id = hcloud_network.k3s_network.id
    ip         = "10.0.1.10"
  }
  
  firewall_ids = [hcloud_firewall.k3s_firewall.id]
  
  user_data = templatefile("${path.module}/scripts/install-k3s-master.sh", {
    master_ip = "10.0.1.10"
    token     = random_password.k3s_token.result
  })
  
  labels = {
    role = "master"
    k3s  = "true"
  }
}

