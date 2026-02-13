package com.homeservices;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class HomeServicesApplication {

    public static void main(String[] args) {
        SpringApplication.run(HomeServicesApplication.class, args);
    }
}
