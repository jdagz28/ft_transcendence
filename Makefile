dev-up:
	docker compose -f $(COMPOSE_FILE) --profile dev up -d

dev-down:
	docker compose -f $(COMPOSE_FILE) --profile dev down

dev-start:
	docker compose -f $(COMPOSE_FILE) --profile dev start

dev-stop:
	docker compose -f $(COMPOSE_FILE) --profile dev stop

dev-build:
	docker compose -f $(COMPOSE_FILE) --profile dev build


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
	docker system prune --volumes

re: clean all

.PHONY: