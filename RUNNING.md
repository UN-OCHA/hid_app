## Running this code with the Phase2 dev VM

You can easily run this code using the same containers that will run in production using the Phase2 Dev VM and Docker. Running with Docker is also quite quick after the first download, and there's need for an rsync watcher to pick up changes.

In addition, your code and data are saved on a different disk partition, so the VM can be upgraded or destroyed without losing your work.

### Prerequisites

- You must be on a network where the 172.17.0.0/16 and 172.20.20.0/24 subnets are available for you to route.
- You must not be using a VPN or other tool that will aggresively manage the routing table on your machine.

### Linux Setup

(Coming soon - it will mostly involve setting up the Docker daemon in a specific way.)

### Mac Setup

- Install docker 1.3.x. (Either using `brew install docker` or installing the boot2docker package at <https://docs.docker.com/installation/mac/>.)
- Install fig 1.0.x. (Either using `brew install fig` or using the curl method <http://www.fig.sh/install.html>.)
- Install Vagrant and VirtualBox or Vagrant and VMware and the VMware provider.
- Clone https://bitbucket.org/phase2tech/\_devtools\_vm and `vagrant up`.
- Once the tonistiigi/dnsdock and phase2/devtools-fileserver containers have downloaded, mount the code and data shares on your Mac by choosing Go > Connect to Server in the finder and entering `smb://Dev-VM`. ![connecting to the VM file shares](https://www.evernote.com/shard/s2/sh/0287f382-0439-4dcd-9faf-8e60baf1e9d8/edd7ede8af6cfdebfdea2830c561d0be/res/493c94da-060c-481c-b30d-63d47e9ffd45/skitch.png). Mount both shares.
- Add the line `export DOCKER_HOST=tcp://localhost:2375` to your shell config. This will let you run Docker commands against the dev VM while it is running. After making this change active, you should be able to run `docker ps` to see at least two running containers.

### Running the site

- Log into the UN OCHA docker hub by running `docker login`. Enter the username, password, and email address found on: https://wiki.phase2technology.com/display/UN/New+BlackMesh+Infrastructure
- Using your tool of choice, clone `git@bitbucket.org:phase2tech/hid_app.git` into the code share.
- Run `fig up` from the `/Volumes/code/hid_app` directory.
- This will download one container from the Docker hub and then run it.
- After seeing the output, `Attaching to hidapp_app_1`, you should be able to access the site at http://app.contactsid.vm/ in your browser.

### Working with Docker

- You may use the `docker ps` command to see all running containers. The dev VM runs two containers named 'file-server' and 'buildtools' to provide its base services.
- If you want to get a **shell** on either of the containers, you may do so with the `docker exec` command using its name.
    - To get a shell on the mongo container, for example, you may do a `docker exec -it hidapp_app_1 /bin/bash` from your Mac. Note that you will be logged in as root and process ID 1 in your container will either be mongo or node or forego (a process manager for running multiple processes.)
- By default, `fig up` will run the containers in the foreground and you will get nginx and node and Mongo logs in your terminal.
    - You can stop both services by hitting Ctrl-c.
- If you wish to run the containers in the background, you may run them with `fig up -d`.
    - Note that in this case, you can still get the logs for the containers by doing a `docker logs -f hidapp_app_1` or `docker logs -f hidapp_app_1`.
    - You may then stop the containers either via direct `docker stop` commands
- If you need to destroy the instances of the containers for some reason, you may `fig rm` and `fig up`. Note that the Mongo database will remain persistent, since it always uses the same location on the data partition, so this is not a lossy operation.

### Troubleshooting

**HELP! Something's wrong!**

While we hope your experience will be trouble-free, here are some problems we've seen and their solutions.

#### Trying to access any .vm address just hangs.

This has happened a few times in testing. The issue is likely one of two things.

First, your Mac may have lost its static route to the .vm DNS server and the IP space for the containers.

To check this, you can issue the following command:

```
me@myhost$ netstat -rn | grep 172.17
172.17             172.20.20.20       UGSc            0        0  vmnet4
```

If you do not see that second line, your Mac has lost its route to the proxy VM (at IP 172.20.20.20.) You can fix this by running a `vagrant provision` in the \_devtools\_vm directory.

Second, it is possible that your VM has someone lost its link on the 172.20.20.20 address. This happens rarely, but it is possible. To check this, `vagrant ssh` into the dev VM and issue the following command:

```
core@dev-vm ~ $ ip addr | grep -A1 -B2 172.20.20.20
3: ens34: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP qlen 1000
    link/ether 00:0c:29:bc:67:21 brd ff:ff:ff:ff:ff:ff
    inet 172.20.20.20/24 brd 172.20.20.255 scope global ens34
       valid_lft forever preferred_lft forever
```

If you do not see the 172.20.20.20 address under the interface ("ens34" in this example,) then your VM has lost its link somehow. If this happens, a `vagrant reload` on the dev VM should fix it. If you encounter this in testing, please come into the *devtools-project* flow and see if anyone is around to help - we'd like to try to catch this in the wild.
