cmake_minimum_required(VERSION 3.7)
set(NAME messenger_crypt)
project(${NAME}_tests)

set(GTEST_DIR lib/googletest/googletest)
add_subdirectory(${GTEST_DIR})

FILE(GLOB SRCS src/*.cpp)

include_directories(SYSTEM ${GTEST_DIR}/include)
include_directories(${messenger_crypt_SOURCE_DIR}/include)
add_executable(${PROJECT_NAME} ${SRCS})

# frozen
set(FROZEN_DIR ${messenger_crypt_SOURCE_DIR}/lib/frozen)
include_directories(${FROZEN_DIR})
target_link_libraries(${PROJECT_NAME} frozen)
message(STATUS "Found frozen")

target_link_libraries(${PROJECT_NAME} gtest)
target_link_libraries(${PROJECT_NAME} messenger_crypt)

add_test(${PROJECT_NAME} ${PROJECT_NAME})
