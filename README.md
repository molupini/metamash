# Name Service

[![Build Status](https://travis-ci.org/joemccann/dillinger.svg?branch=master)](https://travis-ci.org/)

Is a Infrastructure as Code Naming Service.
Powered by Nodejs and Mongodb.

  - Deploy with docker-compose 
  - Important postman.json
  - Seed Labels
  - Create Connector
  - Create Accounts

# Features

You can:
  - Generate Names
  - Build a relationship between parent/child organizations
  

# Tech

name-service uses a number of open source projects to work properly:

* [node.js] - open-source, JavaScript runtime environment 
* [express] - node.js web framework
* [mongodb] - document-oriented database program

# Installation


#### Install

name-service requires [Node.js](https://nodejs.org/) v7+ to run.
Open your favorite Terminal and run these commands.

First, if necessary:
```sh
$ mkdir ./iac
$ cd iac/
```
Second:
```sh
$ git init
```
Third:
```sh
$ git clone git@gitlab.com:bcx-sanlam-group/nameservice.git
```


#### Author

Using node + nodemon + docker for fast developing. Making any change in your source file will update immediately.

Before we begin, required environment variables:
```sh
$ vi ./.env/app.development.env

# # Express
NODE_ENV=development
MONGODB_APP_URL=mongodb://dbadmin:PleasePassTheSaltAndPepper2019@ns-mongo:27018/ns?authSource=admin

# # MONGODB
MONGO_INITDB_ROOT_USERNAME=dbadmin
MONGO_INITDB_ROOT_PASSWORD=PleasePassTheSaltAndPepper2019
MONGO_INITDB_DATABASE=ns
```


### Deploy

Easily done in a Docker container.

#### Services

[![N|Solid](SERVICES.png)](SERVICES.png)

Make required changes within Dockerfile + compose files if necessary. When ready, simply use docker-compose to build your environment.
This will create the ns-express, ns-mongo services with necessary dependencies.
Once done, simply import postman.json into Postman:

For dev, docker compose:
```sh
$ docker-compose build
$ docker-compose up
```

Verify the deployment by navigating to your server address in your preferred browser. Below is a simple health check. 


```sh
$ curl http://localhost:3001/healthv
```

For prod, build:
```sh
$ docker build -f mongo.Dockerfile -t mauriziolupini/ns-mongo:prod .
$ docker build -f express.Dockerfile -t mauriziolupini/ns-express:prod .
```

Commit prod, push docker builds:
```sh
$ docker push mauriziolupini/ns-mongo:prod
$ docker push mauriziolupini/ns-express:prod
```

Get prod, pull docker builds:
```sh
$ docker pull mauriziolupini/ns-mongo:prod
$ docker pull mauriziolupini/ns-express:prod
```

Run prod, either docker run:
```sh
docker network create --driver bridge ns_network
docker run -d --net=ns_network --name ns-mongo --hostname ns-mongo -e "MONGO_INITDB_ROOT_USERNAME=" -e "MONGO_INITDB_ROOT_PASSWORD=" -e "MONGO_INITDB_DATABASE=" -p 37017:27017 mauriziolupini/ns-mongo:prod
docker run -d --net=ns_network --name ns-express --hostname ns-express -e "NODE_ENV=" -e "MONGODB_APP_URL=" -p 3000:3000 mauriziolupini/ns-express:prod
```

Run prod, or docker swarm:
```sh
docker stack deploy -c nameservice.yml NS
```


#### Kubernetes + Google Cloud

See [KUBERNETES.md] coming soon.


# Future Release

  - TBD.


# Operating
Simple API operating instructions. Using [postman], a collaboration platform for API development. Import postman.json. 

Edit environment variable:
```sh
url localhost:3001
```

# License

MIT

# Author
**Want to contribute? Great! See repo [git-repo-url] from [Maurizio Lupini][mo]    -Author, Working at [...][linkIn]**


   [mo]: <https://github.com/molupini>
   [linkIn]: <https://za.linkedin.com/in/mauriziolupini>
   [git-repo-url]: <https://gitlab.com/bcx-sanlam-group/nameservice.git>
   [node.js]: <http://nodejs.org>
   [express]: <http://expressjs.com>
   [mongodb]: <https://www.mongodb.com/>
   [postman]: <https://www.getpostman.com/>
