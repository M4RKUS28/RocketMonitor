#!/bin/bash

# get sudo permissions
if [ "$EUID" -ne 0 ]; then
    echo "Bitte führe dieses Skript mit sudo aus."
    exit 1
fi

sudo apt-get update
sudo apt-get install python3-dev
sudo apt-get install python3-pip
sudo apt-get install python3-venv
sudo apt-get install libmysqlclient-dev
