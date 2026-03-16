import { createRouter, createWebHistory } from 'vue-router';

import TableView from "../views/TableView.vue";
import TestView from "../views/TestView.vue";

const routes = [
    { path: '/', redirect: '/test' },
    { path: '/table', component: TableView },
    { path: '/test', component: TestView },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;
