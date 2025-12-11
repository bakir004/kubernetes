output "master_ip" {
  description = "K3s master node IP address"
  value       = hcloud_server.k3s_master.ipv4_address
}

output "master_private_ip" {
  description = "K3s master node private IP"
  value       = hcloud_server.k3s_master.network[0].ip
}

output "worker_ips" {
  description = "K3s worker node IP addresses"
  value       = [for worker in hcloud_server.k3s_worker : worker.ipv4_address]
}

output "kubeconfig_command" {
  description = "Command to get kubeconfig"
  value       = "ssh root@${hcloud_server.k3s_master.ipv4_address} 'cat /etc/rancher/k3s/k3s.yaml'"
}

output "k3s_token" {
  description = "K3s cluster token (for adding more workers)"
  value       = random_password.k3s_token.result
  sensitive   = true
}

