FROM postgres:15-alpine
RUN apk add --no-cache python3 py3-pip bash
WORKDIR /scripts
CMD ["tail", "-f", "/dev/null"]
