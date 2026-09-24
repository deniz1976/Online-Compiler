#define _GNU_SOURCE
#include <errno.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/resource.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

static long long monotonic_ms(void) {
  struct timespec ts;
  clock_gettime(CLOCK_MONOTONIC, &ts);
  return (long long)ts.tv_sec * 1000LL + ts.tv_nsec / 1000000LL;
}

static long long timeval_ms(struct timeval tv) {
  return (long long)tv.tv_sec * 1000LL + tv.tv_usec / 1000LL;
}

static int write_report(const char *path, int timed_out, int exit_code, int signal_number,
                        long long wall_ms, const struct rusage *usage) {
  FILE *report = fopen(path, "w");
  if (report == NULL) {
    perror("oc-runner: report");
    return -1;
  }
  fprintf(report,
          "{\"timedOut\":%s,\"exitCode\":%d,\"signal\":%d,\"wallMs\":%lld,\"cpuMs\":%lld,\"maxRssKb\":%ld}\n",
          timed_out ? "true" : "false", exit_code, signal_number, wall_ms,
          timeval_ms(usage->ru_utime) + timeval_ms(usage->ru_stime), usage->ru_maxrss);
  return fclose(report);
}

int main(int argc, char **argv) {
  if (argc < 4) {
    fprintf(stderr, "usage: oc-runner <timeout-ms> <report-path> <program> [args...]\n");
    return 2;
  }

  char *end = NULL;
  long long timeout_ms = strtoll(argv[1], &end, 10);
  if (end == argv[1] || *end != '\0' || timeout_ms <= 0) {
    fprintf(stderr, "oc-runner: invalid timeout\n");
    return 2;
  }

  sigset_t child_signal;
  sigemptyset(&child_signal);
  sigaddset(&child_signal, SIGCHLD);
  sigprocmask(SIG_BLOCK, &child_signal, NULL);

  long long started = monotonic_ms();
  pid_t pid = fork();
  if (pid < 0) {
    perror("oc-runner: fork");
    return 2;
  }

  if (pid == 0) {
    setpgid(0, 0);
    sigprocmask(SIG_UNBLOCK, &child_signal, NULL);
    execv(argv[3], &argv[3]);
    perror("oc-runner: exec");
    _exit(127);
  }

  setpgid(pid, pid);

  int status = 0;
  int timed_out = 0;
  struct rusage usage = {0};

  for (;;) {
    pid_t reaped = wait4(pid, &status, WNOHANG, &usage);
    if (reaped == pid) {
      break;
    }
    if (reaped < 0 && errno != EINTR) {
      perror("oc-runner: wait");
      return 2;
    }

    long long remaining = timeout_ms - (monotonic_ms() - started);
    if (remaining <= 0) {
      timed_out = 1;
      kill(-pid, SIGKILL);
      while (wait4(pid, &status, 0, &usage) < 0 && errno == EINTR) {
      }
      break;
    }

    struct timespec wait_for = {remaining / 1000, (remaining % 1000) * 1000000L};
    sigtimedwait(&child_signal, NULL, &wait_for);
  }

  long long wall_ms = monotonic_ms() - started;
  kill(-pid, SIGKILL);

  int exit_code = 0;
  int signal_number = 0;
  if (WIFEXITED(status)) {
    exit_code = WEXITSTATUS(status);
  } else if (WIFSIGNALED(status)) {
    signal_number = WTERMSIG(status);
    exit_code = 128 + signal_number;
  }

  if (write_report(argv[2], timed_out, exit_code, signal_number, wall_ms, &usage) != 0) {
    return 2;
  }

  return exit_code;
}
