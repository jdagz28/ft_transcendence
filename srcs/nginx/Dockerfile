FROM debian:bullseye

RUN apt-get update && apt-get upgrade -y
RUN apt-get install -y nginx openssl gettext-base   

RUN mkdir -p /etc/nginx/ssl

COPY ./conf/nginx.conf.template /etc/nginx/nginx.conf.template
COPY ./conf/nginx-start.sh /nginx-start.sh
RUN chmod +x /nginx-start.sh

ENTRYPOINT ["/nginx-start.sh"]
