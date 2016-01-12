



#include <stdlib.h>
#include <stdio.h>


int testfunc(const char *msg) {
  printf("msg: %s\n", msg);
  return 0;
}

//extern int testfunc(const char *msg);

int callit( typeof(testfunc) *func, char *msg) {
  return func(msg);
}

int main(int argc, char **argv) {
  callit(&testfunc, "Hello, world");
}
