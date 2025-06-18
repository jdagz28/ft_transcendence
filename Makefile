SRCS_DIR		:= ./srcs/
DB_DIR			:= ./data/ft_transcendence/sqlite
FRONT_DIR		:= ./data/ft_transcendence/frontend

COMPOSE_FILE 	:= $(SRCS_DIR)docker-compose.yml


dev-up:
	mkdir -p $(DB_DIR)
	mkdir -p $(FRONT_DIR)
	docker compose -f $(COMPOSE_FILE) --profile build up -d
	docker compose -f $(COMPOSE_FILE) --profile development up -d

dev-down:
	docker compose -f $(COMPOSE_FILE) --profile development down

dev-start:
	docker compose -f $(COMPOSE_FILE) --profile development start

dev-stop:
	docker compose -f $(COMPOSE_FILE) --profile development stop

dev-build:
	docker compose -f $(COMPOSE_FILE) --profile development build

game:
	docker compose -f $(COMPOSE_FILE) --profile game up -d

front:
	docker compose -f $(COMPOSE_FILE) --profile frontend up -d

front-build:
	docker compose -f $(COMPOSE_FILE) --profile frontend build


testAccounts:
	@chmod +x dev_testAccounts.sh
	@./dev_testAccounts.sh

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
	rm -rf $(DB_DIR)
	rm -rf $(FRONT_DIR)
	docker system prune --volumes

.PHONY: dev-up dev-down dev-start dev-stop dev-build \
		game front front-stop front-build front-re testAccounts \
		accessauth accessdb stop-containers remove-containers \
		remove-images remove-networks clean prune

