SRCS_DIR		:= ./srcs/
DB_DIR			:= ./data/ft_transcendence/sqlite

COMPOSE_FILE 	:= $(SRCS_DIR)docker-compose.yml

auth-up:
	mkdir -p $(DB_DIR)
	#  chmod 777 $(DB_DIR) # change
	docker compose -f $(COMPOSE_FILE) --profile authentication up -d

auth-down:
	docker compose -f $(COMPOSE_FILE) --profile authentication down

auth-start:
	docker compose -f $(COMPOSE_FILE) --profile authentication start

auth-stop:
	docker compose -f $(COMPOSE_FILE) --profile authentication stop

auth-build:
	docker compose -f $(COMPOSE_FILE) --profile authentication build


accessauth:
	docker exec -it authentication sh

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
	#  rm -rf $(DB_DIR)
	docker system prune --volumes

.PHONY: