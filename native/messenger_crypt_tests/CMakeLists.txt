cmake_minimum_required(VERSION 3.7)
set(NAME messenger_crypt)
project(${NAME}_tests)

set(GTEST_DIR lib/googletest/googletest)
add_subdirectory(${GTEST_DIR})

FILE(GLOB SRCS src/*.cpp)

include_directories(${GTEST_DIR}/include)
include_directories(${MESSENGER_CRYPT_SOURCE_DIR}/include)
add_executable(${PROJECT_NAME} ${SRCS})

target_link_libraries(${PROJECT_NAME} gtest_main)
target_link_libraries(${PROJECT_NAME} messenger_crypt)

