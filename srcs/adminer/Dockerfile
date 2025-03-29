FROM debian:bullseye

RUN apt-get update && apt-get install -y php-cli php-sqlite3 wget

COPY ./conf/adminer_conf.sh /
RUN chmod +x /adminer_conf.sh

CMD ["/adminer_conf.sh"]
