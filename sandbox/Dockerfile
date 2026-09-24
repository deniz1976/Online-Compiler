FROM gcc:14

COPY runner.c /tmp/runner.c
RUN gcc -O2 -Wall -Wextra -Werror -static -o /usr/local/bin/oc-runner /tmp/runner.c \
  && rm /tmp/runner.c
