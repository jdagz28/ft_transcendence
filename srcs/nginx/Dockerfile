FROM debian:bullseye

RUN apt-get update && apt-get upgrade -y
RUN apt-get install -y nginx openssl gettext-base   

RUN mkdir -p /etc/nginx/ssl

COPY ./conf/nginx.conf.template /etc/nginx/nginx.conf.template
COPY ./conf/nginx-start.sh /nginx-start.sh
COPY ./conf/proxy_params /etc/nginx/proxy_params
RUN chmod +x /nginx-start.sh

ENTRYPOINT ["/nginx-start.sh"]
