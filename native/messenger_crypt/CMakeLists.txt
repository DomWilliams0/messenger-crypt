cmake_minimum_required(VERSION 3.7)
set(PROJECT_NAME messenger_crypt)
project(${PROJECT_NAME})

# find source files
FILE(GLOB SRCS src/*.c)

# compiler flags
execute_process(COMMAND gpgme-config --cflags OUTPUT_VARIABLE GPG_FLAGS )
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -std=c11 -Werror ${GPG_FLAGS}")

# create as shared library
add_library(${PROJECT_NAME} SHARED ${SRCS})

# frozen
add_subdirectory(lib/frozen)
include_directories(lib/frozen)
target_link_libraries(${PROJECT_NAME} frozen)
message(STATUS "Found frozen")

# libconfig
set(CMAKE_MODULE_PATH "${CMAKE_CURRENT_LIST_DIR}/cmake_modules" ${CMAKE_MODULE_PATH})
find_package(Config REQUIRED)
include_directories(${CONFIG_INCLUDE_DIR})
target_link_libraries(${PROJECT_NAME} ${CONFIG_LIBRARY})

# gpgme
find_package(Gpgme REQUIRED)
include_directories(${GPGME_INCLUDES})
target_link_libraries(${PROJECT_NAME} ${GPGME_VANILLA_LIBRARIES})
