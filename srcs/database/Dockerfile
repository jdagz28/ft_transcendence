FROM debian:bullseye

RUN apt-get update && apt-get install -y sqlite3 && \ 
    apt-get clean

COPY ./conf/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT [ "/entrypoint.sh" ]