.PHONY: help build up down logs clean test

help:
	@echo "Kirin Bot - Makefile"
	@echo ""
	@echo "Available targets:"
	@echo "  build    - Build Docker images"
	@echo "  up       - Start services and run summarization"
	@echo "  down     - Stop and remove containers"
	@echo "  logs     - View container logs"
	@echo "  clean    - Remove containers, volumes, and images"
	@echo "  test     - Run locally (requires Ollama running)"

build:
	docker-compose build

up:
	docker-compose up

down:
	docker-compose down

logs:
	docker-compose logs -f

clean:
	docker-compose down -v --rmi all
	rm -rf output/*.txt

test:
	npm install
	npm run build
	npm run dev

