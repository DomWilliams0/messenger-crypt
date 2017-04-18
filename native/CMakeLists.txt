cmake_minimum_required(VERSION 3.7)

project(messenger_crypt)
set(TESTS ${PROJECT_NAME}_tests)

set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wall -Wextra -O1")

set(PROJECT_VERSION_MAJOR 1)
set(PROJECT_VERSION_MINOR 0)

# executable
set(EXE ${PROJECT_NAME}_native)
add_executable(${EXE} ${PROJECT_NAME}/src/native.c)
include_directories(${PROJECT_NAME}/include)

# sub-targets
add_subdirectory(${PROJECT_NAME})
add_subdirectory(${TESTS})

# link to lib
target_link_libraries(${EXE} ${PROJECT_NAME})
