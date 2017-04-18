cmake_minimum_required(VERSION 3.7)

project(messenger_crypt)
set(TESTS ${PROJECT_NAME}_tests)

option(coveralls "enable -O0, -g and --coverage" OFF)

set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wall -Wextra")
if(coveralls)
	set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O0 -g --coverage")
else()
	set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O1")
endif()

message(${CMAKE_CXX_FLAGS})
set(CMAKE_C_FLAGS "${CMAKE_CXX_FLAGS}")

set(PROJECT_VERSION_MAJOR 1)
set(PROJECT_VERSION_MINOR 0)

# executable
set(EXE ${PROJECT_NAME}_native)
add_executable(${EXE} ${PROJECT_NAME}/src/native.c)
include_directories(${PROJECT_NAME}/include)

add_subdirectory(${PROJECT_NAME})
target_link_libraries(${EXE} ${PROJECT_NAME})

enable_testing()
add_subdirectory(${TESTS})
