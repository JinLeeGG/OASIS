import socket
import json
import sys
import threading
import signal

from whisplay import WhisplayBoard

clients = {}


def send_to_all_clients(message):
    message_json = json.dumps(message).encode("utf-8") + b"\n"
    for addr, client_socket in list(clients.items()):
        try:
            client_socket.sendall(message_json)
        except Exception as e:
            print(f"[Server] Failed to send to {addr}: {e}")


def on_button_pressed():
    print("[Server] Button pressed")
    send_to_all_clients({"event": "button_pressed"})


def on_button_release():
    print("[Server] Button released")
    send_to_all_clients({"event": "button_released"})


def handle_client(client_socket, addr):
    print(f"[Socket] Client {addr} connected")
    clients[addr] = client_socket
    try:
        buffer = ""
        while True:
            data = client_socket.recv(4096).decode("utf-8")
            if not data:
                break
            buffer += data
            while "\n" in buffer:
                line, buffer = buffer.split("\n", 1)
                if not line.strip():
                    continue
                try:
                    client_socket.send(b"OK\n")
                except Exception as e:
                    print(f"[Socket - {addr}] Send error: {e}")
    except Exception as e:
        print(f"[Socket - {addr}] Connection error: {e}")
    finally:
        print(f"[Socket] Client {addr} disconnected")
        del clients[addr]
        client_socket.close()


def start_socket_server(whisplay, host="0.0.0.0", port=12345):
    whisplay.on_button_press(on_button_pressed)
    whisplay.on_button_release(on_button_release)

    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server_socket.bind((host, port))
    server_socket.listen(5)
    print(f"[Socket] Listening on {host}:{port} ...")

    try:
        while True:
            client_socket, addr = server_socket.accept()
            client_thread = threading.Thread(
                target=handle_client, args=(client_socket, addr)
            )
            client_thread.daemon = True
            client_thread.start()
    except KeyboardInterrupt:
        print("[Socket] Server stopped")
    finally:
        server_socket.close()


if __name__ == "__main__":
    whisplay = WhisplayBoard()

    def cleanup_and_exit(signum, frame):
        print("[System] Exiting...")
        whisplay.cleanup()
        sys.exit(0)

    signal.signal(signal.SIGTERM, cleanup_and_exit)
    signal.signal(signal.SIGINT, cleanup_and_exit)

    start_socket_server(whisplay, host="0.0.0.0", port=12345)
