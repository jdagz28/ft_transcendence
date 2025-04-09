SRCS_DIR		:= ./srcs/
DB_DIR			:= /home/ft_transcendence/sqlite

COMPOSE_FILE 	:= $(SRCS_DIR)docker-compose.yml

user-up:
	sudo mkdir -p $(DB_DIR)
	sudo chmod 777 $(DB_DIR) # change
	docker compose -f $(COMPOSE_FILE) --profile userManagement up -d

user-down:
	docker compose -f $(COMPOSE_FILE) --profile userManagement down

user-start:
	docker compose -f $(COMPOSE_FILE) --profile userManagement start

user-stop:
	docker compose -f $(COMPOSE_FILE) --profile userManagement stop

user-build:
	docker compose -f $(COMPOSE_FILE) --profile userManagement build


accessbackend:
	docker exec -it backend sh

accessdb:
	docker exec -it database bash

stop-containers:
	@if [ -n "$$(docker container ls -aq)" ]; then \
		docker container stop $$(docker container ls -aq); \
	fi

remove-containers:
	@if [ -n "$$(docker container ls -aq)" ]; then \
		docker container rm $$(docker container ls -aq); \
	fi

remove-images:
	@if [ -n "$$(docker images -aq)" ]; then \
		docker rmi -f $$(docker images -aq); \
	fi

remove-networks:
	@docker network ls --format '{{.Name}}' | \
		grep -vE '^(bridge|host|none|system)' | \
		xargs -r docker network rm

clean: stop-containers remove-containers remove-images remove-networks


prune: clean
	sudo rm -rf $(DB_DIR)
	docker system prune --volumes

.PHONY: